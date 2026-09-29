import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

/**
 * Validates whether a given string is a standard RFC 4122 compliant UUID.
 * Prevents PostgreSQL 'invalid input syntax for type uuid' errors.
 */
export const isValidUUID = (value: string | null | undefined): boolean => {
  if (!value || typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
};

/**
 * Deterministically converts any identifier string (e.g., Firebase UID or email) into
 * a valid RFC 4122 v4 UUID, ensuring PostgreSQL compatibility.
 */
export const stringToUUID = (input: string | null | undefined): string => {
  if (!input || typeof input !== 'string') {
    return '00000000-0000-4000-8000-000000000000';
  }
  const trimmed = input.trim();
  if (isValidUUID(trimmed)) {
    return trimmed;
  }
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57, h3 = 0x811c9dc5, h4 = 0x6a09e667;
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 3812015801);
    h4 = Math.imul(h4 ^ ch, 2184229441);
  }
  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  const hex = (toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4)).toLowerCase();

  const part1 = hex.slice(0, 8);
  const part2 = hex.slice(8, 12);
  const part3 = '4' + hex.slice(13, 16);
  const variantNibble = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const part4 = variantNibble + hex.slice(17, 20);
  const part5 = hex.slice(20, 32);

  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
};

/**
 * Checks whether there is a currently authenticated Supabase session with a valid UUID.
 * Returns the authenticated user info or null if unauthenticated or invalid ID state.
 */
export const getAuthenticatedSessionUser = async (): Promise<{ id: string; email?: string } | null> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user || !isValidUUID(session.user.id)) {
      return null;
    }
    return { id: session.user.id, email: session.user.email };
  } catch {
    return null;
  }
};

/**
 * Official Supabase Client for IP Room (Nepal's Room Finder)
 * Project: stygqxxldbegjilpzlco
 */
const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  (import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string) ||
  'https://stygqxxldbegjilpzlco.supabase.co';

const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  (import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string) ||
  'sb_publishable_nxl9JQoEpOUMh0CC42XK6Q_k8rju9C3';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'iproom_supabase_auth_session',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export default supabase;
