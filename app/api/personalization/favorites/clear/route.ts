/**
 * KofyOne - Clear All Favorites Route
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: 'Failed to clear favorites' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'All saved favorites have been cleared.' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
