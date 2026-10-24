/**
 * KofyOne - Secure Sign-Out Route Handler
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const cookieStore = await cookies();
    // Clear any legacy test cookies
    cookieStore.delete('kofyone_admin_session');

    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {}

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'An error occurred during sign out.' },
      { status: 500 }
    );
  }
}
