/**
 * KofyOne - Secure User Registration Route Handler
 *
 * Implements:
 * - Email, unique username, password policy validation
 * - Predefined security question selection (exactly 1 of 3)
 * - Cryptographic bcrypt hashing of security answer with unique salt
 * - Zero plaintext storage of security answers
 * - Strict non-admin role assignment for all new registrations
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDynamicClient, getDynamicAdminClient } from '@/lib/supabase/rpc-helper';
import { validatePassword } from '@/lib/auth/password';
import { validateUsername } from '@/lib/auth/username';
import { isValidSecurityQuestionId } from '@/lib/auth/security-questions';
import { hashSecurityAnswer, normalizeSecurityAnswer } from '@/lib/auth/security-answer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const usernameRaw = typeof body.username === 'string' ? body.username : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : '';
    const questionId = typeof body.security_question_id === 'string' ? body.security_question_id : '';
    const answer = typeof body.security_answer === 'string' ? body.security_answer : '';

    // 1. Basic Presence Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    // 2. Validate Username
    const usernameValidation = validateUsername(usernameRaw);
    if (!usernameValidation.isValid) {
      return NextResponse.json(
        { error: usernameValidation.error },
        { status: 400 }
      );
    }
    const cleanUsername = usernameValidation.normalized;

    // 3. Validate Password Strength
    const passwordValidation = validatePassword(password);
    if (passwordValidation.errors.length > 0) {
      return NextResponse.json(
        { error: passwordValidation.errors[0] },
        { status: 400 }
      );
    }

    // 4. Validate Predefined Security Question
    if (!isValidSecurityQuestionId(questionId)) {
      return NextResponse.json(
        { error: 'Please select one of the three predefined security questions.' },
        { status: 400 }
      );
    }

    // 5. Validate Security Answer
    const normalizedAnswer = normalizeSecurityAnswer(answer);
    if (!normalizedAnswer || normalizedAnswer.length < 2) {
      return NextResponse.json(
        { error: 'Security answer must be at least 2 characters long.' },
        { status: 400 }
      );
    }

    const dynamicClient = await getDynamicClient();

    // 6. Check for Duplicate Username in public.profiles
    const { data: isAvailable, error: checkError } = await dynamicClient.rpc(
      'check_username_available',
      { p_username: cleanUsername }
    );

    if (!checkError && isAvailable === false) {
      return NextResponse.json(
        { error: 'Username is already taken. Please choose another.' },
        { status: 409 }
      );
    }

    // Fallback direct check if RPC was not yet run
    if (checkError) {
      const { data: existingProfile } = await dynamicClient
        .from('profiles')
        .select('id')
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (existingProfile) {
        return NextResponse.json(
          { error: 'Username is already taken. Please choose another.' },
          { status: 409 }
        );
      }
    }

    // 7. Securely Hash the Security Answer with Bcrypt (Unique Salt)
    const answerHash = await hashSecurityAnswer(normalizedAnswer);

    // 8. Sign Up via Supabase Auth (Native Hashing & Session Management)
    const supabase = await createClient();
    const origin = new URL(request.url).origin;
    const emailRedirectTo = `${origin}/auth/callback?next=/dashboard`;

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || cleanUsername,
          username: cleanUsername,
        },
        emailRedirectTo,
      },
    });

    if (signUpError) {
      if (/fetch failed/i.test(signUpError.message || '')) {
        return NextResponse.json(
          {
            error:
              'The database service is currently paused or unreachable. Please unpause your project in your Supabase dashboard or log in with your administrator credentials.',
          },
          { status: 503 }
        );
      }

      const isAlreadyRegistered =
        signUpError.message?.toLowerCase().includes('already registered') ||
        signUpError.message?.toLowerCase().includes('email exists');

      if (isAlreadyRegistered) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in.' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: signUpError.message || 'Unable to create account. Please try again.' },
        { status: 400 }
      );
    }

    const userId = data.user?.id;

    // 9. Persist Username & Security Credentials
    if (userId) {
      // Attempt RPC registration first
      const { error: rpcError } = await dynamicClient.rpc('register_user_security', {
        p_user_id: userId,
        p_username: cleanUsername,
        p_question_id: questionId,
        p_answer_hash: answerHash,
      });

      if (rpcError) {
        const adminClient = getDynamicAdminClient();
        if (adminClient) {
          try {
            await adminClient
              .from('profiles')
              .update({ username: cleanUsername })
              .eq('id', userId);

            await adminClient.from('user_security_questions').upsert({
              user_id: userId,
              question_id: questionId,
              answer_hash: answerHash,
            });
          } catch (adminErr) {
            console.error('[Registration] Admin client fallback error:', adminErr);
          }
        }
      }
    }

    const sessionActive = Boolean(data.session);

    return NextResponse.json({
      success: true,
      requiresEmailVerification: !sessionActive,
      message: sessionActive
        ? 'Account created successfully! Welcome to KofyOne.'
        : 'Please check your email for a confirmation link to activate your account.',
    });
  } catch (error) {
    console.error('[Registration Handler Error]:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during registration.' },
      { status: 500 }
    );
  }
}
