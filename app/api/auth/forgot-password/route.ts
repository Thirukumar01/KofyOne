/**
 * KofyOne - Secure Forgot Password Route Handler
 *
 * Implements:
 * - Identification via registered email or username
 * - Verification against stored bcrypt hash of the security answer
 * - Rolling 1-hour rate limiting: maximum TWO failed attempts
 * - Constant error messaging preventing account enumeration
 * - Generation of single-use, cryptographically secure password reset token
 */

import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getDynamicClient, getDynamicAdminClient } from '@/lib/supabase/rpc-helper';
import { isValidSecurityQuestionId } from '@/lib/auth/security-questions';
import { verifySecurityAnswer, normalizeSecurityAnswer } from '@/lib/auth/security-answer';
import {
  checkLockout,
  recordAttempt,
  LOCKOUT_ERROR_MESSAGE,
} from '@/lib/auth/rate-limiter';

// Shared constant error message to prevent user enumeration
const INVALID_CREDENTIALS_MSG = 'Incorrect security question or answer.';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawIdentifier =
      typeof body.identifier === 'string'
        ? body.identifier.trim()
        : typeof body.email === 'string'
        ? body.email.trim()
        : typeof body.username === 'string'
        ? body.username.trim()
        : '';
    const questionId = typeof body.security_question_id === 'string' ? body.security_question_id : '';
    const answer = typeof body.security_answer === 'string' ? body.security_answer : '';

    if (!rawIdentifier) {
      return NextResponse.json(
        { error: 'Email or username is required.' },
        { status: 400 }
      );
    }

    const normalizedIdentifier = rawIdentifier.toLowerCase();

    // 1. Strict Server-Side Rate Limiting Check (2 failed attempts in 1-hour window)
    const lockoutStatus = await checkLockout(normalizedIdentifier);
    if (lockoutStatus.isLocked) {
      return NextResponse.json(
        { error: LOCKOUT_ERROR_MESSAGE },
        { status: 429 }
      );
    }

    // 2. Validate Question & Answer format
    if (!isValidSecurityQuestionId(questionId) || !normalizeSecurityAnswer(answer)) {
      // Record failed attempt for invalid payload structure
      await recordAttempt(normalizedIdentifier, false);
      const postCheck = await checkLockout(normalizedIdentifier);
      if (postCheck.isLocked) {
        return NextResponse.json({ error: LOCKOUT_ERROR_MESSAGE }, { status: 429 });
      }
      return NextResponse.json(
        { error: INVALID_CREDENTIALS_MSG },
        { status: 400 }
      );
    }

    const dynamicClient = await getDynamicClient();

    // 3. Lookup Security Question and Stored Hash
    let userId: string | null = null;
    let storedQuestionId: string | null = null;
    let storedAnswerHash: string | null = null;

    // Try RPC query
    const { data: rpcRows, error: rpcError } = await dynamicClient.rpc(
      'get_security_question_for_verification',
      { p_identifier: normalizedIdentifier }
    );

    if (!rpcError && Array.isArray(rpcRows) && rpcRows.length > 0) {
      const match = rpcRows[0] as {
        out_user_id: string;
        out_question_id: string;
        out_answer_hash: string;
      };
      userId = match.out_user_id;
      storedQuestionId = match.out_question_id;
      storedAnswerHash = match.out_answer_hash;
    } else {
      const adminClient = getDynamicAdminClient();
      if (adminClient) {
        try {
          // Find user by email or username
          const { data: profile } = await adminClient
            .from('profiles')
            .select('id, email, username')
            .or(`email.ilike.${normalizedIdentifier},username.ilike.${normalizedIdentifier}`)
            .maybeSingle();

          const profileData = profile as { id: string } | null;
          if (profileData?.id) {
            userId = profileData.id;
            const { data: sq } = await adminClient
              .from('user_security_questions')
              .select('question_id, answer_hash')
              .eq('user_id', profileData.id)
              .maybeSingle();

            const sqData = sq as { question_id: string; answer_hash: string } | null;
            if (sqData) {
              storedQuestionId = sqData.question_id;
              storedAnswerHash = sqData.answer_hash;
            }
          }
        } catch (adminErr) {
          console.warn('[Forgot Password] Admin fallback lookup warning:', adminErr);
        }
      }
    }

    // 4. Handle Non-Existent User or Missing Security Questions
    if (!userId || !storedQuestionId || !storedAnswerHash) {
      await recordAttempt(normalizedIdentifier, false);
      const postCheck = await checkLockout(normalizedIdentifier);
      if (postCheck.isLocked) {
        return NextResponse.json({ error: LOCKOUT_ERROR_MESSAGE }, { status: 429 });
      }
      // Return identical error message to prevent account enumeration
      return NextResponse.json(
        { error: INVALID_CREDENTIALS_MSG },
        { status: 400 }
      );
    }

    // 5. Verify Selected Question Matches
    const isQuestionMatch = storedQuestionId === questionId;

    // 6. Securely Compare Security Answer against Bcrypt Hash
    const isAnswerMatch = await verifySecurityAnswer(answer, storedAnswerHash);

    if (!isQuestionMatch || !isAnswerMatch) {
      // Record failure
      await recordAttempt(normalizedIdentifier, false, userId);
      const postCheck = await checkLockout(normalizedIdentifier);
      if (postCheck.isLocked) {
        return NextResponse.json({ error: LOCKOUT_ERROR_MESSAGE }, { status: 429 });
      }
      return NextResponse.json(
        { error: INVALID_CREDENTIALS_MSG },
        { status: 400 }
      );
    }

    // 7. Successful Verification: Reset Failure Counter & Issue Single-Use Reset Token
    await recordAttempt(normalizedIdentifier, true, userId);

    const resetToken = crypto.randomBytes(32).toString('hex');

    // Store single-use token in DB
    const { error: tokenError } = await dynamicClient.rpc('store_password_reset_token', {
      p_user_id: userId,
      p_token: resetToken,
    });

    if (tokenError) {
      const adminClient = getDynamicAdminClient();
      if (adminClient) {
        try {
          await adminClient.from('password_reset_tokens').insert({
            user_id: userId,
            token: resetToken,
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            used: false,
          });
        } catch (err) {
          console.error('[Forgot Password] Token persistence fallback error:', err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      resetToken,
      message: 'Security answer verified. You may now set your new password.',
    });
  } catch (error) {
    console.error('[Forgot Password Error]:', error);
    return NextResponse.json(
      { error: 'Failed to process security verification request.' },
      { status: 500 }
    );
  }
}
