/**
 * KofyOne - Secure Password Reset Route Handler
 *
 * Implements:
 * - Consumption of single-use cryptographic reset token
 * - Strict password complexity validation
 * - Native password hashing and session invalidation
 * - Absolute protection of user roles and admin permissions
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDynamicClient, getDynamicAdminClient } from '@/lib/supabase/rpc-helper';
import { validatePassword } from '@/lib/auth/password';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = typeof body.resetToken === 'string' ? body.resetToken.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const confirmPassword =
      typeof body.confirmPassword === 'string' ? body.confirmPassword : '';

    if (!token) {
      return NextResponse.json(
        { error: 'Password reset token is required. Please verify your security answer again.' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: 'New password is required.' },
        { status: 400 }
      );
    }

    if (confirmPassword && password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match.' },
        { status: 400 }
      );
    }

    // Strict Password Validation
    const validation = validatePassword(password);
    if (validation.errors.length > 0) {
      return NextResponse.json(
        { error: validation.errors[0] },
        { status: 400 }
      );
    }

    const dynamicClient = await getDynamicClient();

    // 1. Try applying password reset via atomic database RPC function
    const { data: rpcSuccess, error: rpcError } = await dynamicClient.rpc(
      'apply_password_reset',
      {
        p_token: token,
        p_new_password: password,
      }
    );

    let passwordUpdated = !rpcError && rpcSuccess === true;

    // 2. Fallback via service role if RPC is not available
    if (!passwordUpdated) {
      const adminClient = getDynamicAdminClient();
      if (adminClient) {
        try {
          // Validate token
          const { data: tokenRow } = await adminClient
            .from('password_reset_tokens')
            .select('user_id, expires_at, used')
            .eq('token', token)
            .eq('used', false)
            .maybeSingle();

          const tokenData = tokenRow as {
            user_id: string;
            expires_at: string;
            used: boolean;
          } | null;

          if (tokenData && new Date(tokenData.expires_at).getTime() > Date.now()) {
            // Update password in GoTrue
            const { error: updateError } = await adminClient.auth.admin.updateUserById(
              tokenData.user_id,
              { password }
            );

            if (!updateError) {
              // Mark token as used
              await adminClient
                .from('password_reset_tokens')
                .update({ used: true })
                .eq('token', token);

              // Clean up verification attempts
              await adminClient
                .from('security_verification_attempts')
                .delete()
                .eq('user_id', tokenData.user_id);

              passwordUpdated = true;
            }
          }
        } catch (adminErr) {
          console.error('[Reset Password] Admin fallback error:', adminErr);
        }
      }
    }

    if (!passwordUpdated) {
      return NextResponse.json(
        {
          error:
            'Invalid or expired password reset session. Please return to Forgot Password and verify your security answer again.',
        },
        { status: 400 }
      );
    }

    // Invalidate cookies to log out any existing session
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    for (const c of allCookies) {
      if (c.name.includes('sb-') || c.name.includes('auth')) {
        cookieStore.delete(c.name);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully. You can now sign in with your new credentials.',
    });
  } catch (error) {
    console.error('[Reset Password Exception]:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while updating your password.' },
      { status: 500 }
    );
  }
}
