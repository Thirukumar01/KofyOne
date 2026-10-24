/**
 * KofyOne - Username Availability Check Route
 */

import { NextResponse } from 'next/server';
import { validateUsername } from '@/lib/auth/username';
import { getDynamicClient } from '@/lib/supabase/rpc-helper';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username') || '';

    const validation = validateUsername(username);
    if (!validation.isValid) {
      return NextResponse.json(
        { available: false, error: validation.error },
        { status: 400 }
      );
    }

    const dynamicClient = await getDynamicClient();

    // Check RPC or direct profile query
    const { data: isAvailable, error: rpcError } = await dynamicClient.rpc(
      'check_username_available',
      { p_username: validation.normalized }
    );

    if (!rpcError && typeof isAvailable === 'boolean') {
      return NextResponse.json({
        available: isAvailable,
        error: isAvailable ? null : 'Username is already taken.',
      });
    }

    // Direct fallback
    const { data: existing } = await dynamicClient
      .from('profiles')
      .select('id')
      .ilike('username', validation.normalized)
      .maybeSingle();

    const available = !existing;
    return NextResponse.json({
      available,
      error: available ? null : 'Username is already taken.',
    });
  } catch {
    return NextResponse.json(
      { available: false, error: 'Failed to verify username availability.' },
      { status: 500 }
    );
  }
}
