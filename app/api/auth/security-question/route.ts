/**
 * KofyOne - Update User Security Question Route
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isValidSecurityQuestionId } from '@/lib/auth/security-questions';
import { hashSecurityAnswer } from '@/lib/auth/security-answer';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const questionId = typeof body.question_id === 'string' ? body.question_id : '';
    const answer = typeof body.answer === 'string' ? body.answer : '';

    if (!isValidSecurityQuestionId(questionId)) {
      return NextResponse.json(
        { error: 'Invalid security question selected.' },
        { status: 400 }
      );
    }

    if (!answer || answer.trim().length < 2) {
      return NextResponse.json(
        { error: 'Security answer must be at least 2 characters long.' },
        { status: 400 }
      );
    }

    const answerHash = await hashSecurityAnswer(answer);

    const adminClient = createAdminClient();
    const { error: upsertError } = await (adminClient.from('user_security_questions') as unknown as {
      upsert: (vals: Record<string, unknown>, opts: { onConflict: string }) => Promise<{ error: unknown }>;
    }).upsert(
      {
        user_id: user.id,
        question_id: questionId,
        answer_hash: answerHash,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (upsertError) {
      return NextResponse.json(
        { error: 'Failed to update security question. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Security recovery question updated successfully.',
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
