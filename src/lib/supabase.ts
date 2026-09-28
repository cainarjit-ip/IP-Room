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
