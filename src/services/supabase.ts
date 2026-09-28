import { createClient } from '@supabase/supabase-js';
import { UserProfile, UserRole } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/*
  Expected table (run once in Supabase SQL editor):

  create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    name text,
    email text,
    phone text,
    role text not null default 'renter' check (role in ('renter','owner','admin')),
    university text
  );
  alter table public.profiles enable row level security;

  create policy "read own profile" on public.profiles
    for select using (auth.uid() = id);
  create policy "insert own profile" on public.profiles
    for insert with check (auth.uid() = id and role in ('renter','owner'));
  create policy "update own profile" on public.profiles
    for update using (auth.uid() = id)
    with check (role = (select role from public.profiles where id = auth.uid()));

  Admin users: set role = 'admin' manually from the Supabase dashboard.
*/

const PENDING_ROLE_KEY = 'ip_room_pending_role';

const toProfile = (row: any, fallbackEmail = ''): UserProfile =>
  ({
    id: row.id,
    name: row.name ?? '',
    email: row.email ?? fallbackEmail,
    phone: row.phone ?? '',
    role: (row.role ?? 'renter') as UserRole,
    university: row.university ?? undefined,
  }) as UserProfile;

// ---------- Email sign up ----------
export async function registerWithEmail(
  email: string,
  password: string,
  name: string,
  role: UserRole,
  phone: string,
  university?: string
): Promise<UserProfile> {
  // Never allow self-registration as admin
  const safeRole: UserRole = role === 'admin' ? 'renter' : role;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, phone, role: safeRole, university } },
  });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Sign up failed. Please try again.');

  // No session means "Confirm email" is enabled in Supabase Auth settings
  if (!data.session) {
    throw new Error('Account created. Please check your email and confirm it, then sign in.');
  }

  const row = { id: data.user.id, name, email, phone, role: safeRole, university: university ?? null };
  const { error: profileError } = await supabase.from('profiles').upsert(row);
  if (profileError) throw new Error(profileError.message);

  return toProfile(row, email);
}

// ---------- Email login ----------
export async function loginWithEmail(email: string, password: string): Promise<UserProfile> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);

  const { data: row, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();
  if (profileError || !row) throw new Error('Profile not found for this account.');

  return toProfile(row, email);
}

// ---------- OAuth (redirect flow) ----------
async function loginWithProvider(provider: 'google' | 'facebook', role: UserRole) {
  // Remember the chosen role so it can be applied after the redirect back
  try {
    localStorage.setItem(PENDING_ROLE_KEY, role === 'admin' ? 'renter' : role);
  } catch {
    /* storage may be unavailable */
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin },
  });
  if (error) throw new Error(error.message);
}

export const loginWithGoogle = (role: UserRole) => loginWithProvider('google', role);
export const loginWithFacebook = (role: UserRole) => loginWithProvider('facebook', role);

/**
 * Call once in App after the OAuth redirect (and on app start) to get the current profile.
 * Creates the profile row on first social login using the role chosen in the modal.
 */
export async function getCurrentProfile(): Promise<UserProfile | null> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;

  const { data: existing } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (existing) return toProfile(existing, user.email ?? '');

  let pendingRole: UserRole = 'renter';
  try {
    const stored = localStorage.getItem(PENDING_ROLE_KEY);
    if (stored === 'owner' || stored === 'renter') pendingRole = stored;
    localStorage.removeItem(PENDING_ROLE_KEY);
  } catch {
    /* ignore */
  }

  const row = {
    id: user.id,
    name: (user.user_metadata?.full_name || user.user_metadata?.name || '') as string,
    email: user.email ?? '',
    phone: '',
    role: pendingRole,
    university: null,
  };
  const { error } = await supabase.from('profiles').insert(row);
  if (error) throw new Error(error.message);
  return toProfile(row);
}

// ---------- Password reset ----------
export async function sendPasswordResetEmail(email: string): Promise<{ error?: string }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  return error ? { error: error.message } : {};
}

// ---------- Logout ----------
export async function logoutUser(): Promise<void> {
  await supabase.auth.signOut();
}
