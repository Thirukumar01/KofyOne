/**
 * KofyOne - Supabase Dynamic Query & RPC Client Helper
 *
 * Provides strongly-typed query builder interfaces for dynamic tables
 * and database functions without violating @typescript-eslint/no-explicit-any.
 */

import { createClient } from './server';
import { createAdminClient, hasAdminCredentials } from './admin';

export interface DynamicFilterBuilder {
  eq: (col: string, val: unknown) => DynamicFilterBuilder;
  gte: (col: string, val: unknown) => Promise<{ data: unknown[] | null; error: unknown }>;
  ilike: (col: string, val: string) => DynamicFilterBuilder;
  or: (condition: string) => DynamicFilterBuilder;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
  select: (cols?: string) => DynamicFilterBuilder;
}

export interface DynamicTableBuilder {
  select: (cols?: string) => DynamicFilterBuilder;
  insert: (values: unknown) => Promise<{ error: unknown }>;
  upsert: (values: unknown) => Promise<{ error: unknown }>;
  update: (values: unknown) => {
    eq: (col: string, val: unknown) => Promise<{ error: unknown }>;
  };
  delete: () => {
    eq: (col: string, val: unknown) => Promise<{ error: unknown }>;
  };
}

export interface DynamicDbClient {
  rpc: (
    name: string,
    params?: Record<string, unknown>
  ) => Promise<{ data: unknown; error: unknown }>;
  from: (table: string) => DynamicTableBuilder;
  auth: {
    admin: {
      updateUserById: (
        userId: string,
        attributes: Record<string, unknown>
      ) => Promise<{ data: unknown; error: unknown }>;
    };
  };
}

export async function getDynamicClient(): Promise<DynamicDbClient> {
  const client = await createClient();
  return client as unknown as DynamicDbClient;
}

export function getDynamicAdminClient(): DynamicDbClient | null {
  if (!hasAdminCredentials()) return null;
  try {
    const admin = createAdminClient();
    return admin as unknown as DynamicDbClient;
  } catch {
    return null;
  }
}
