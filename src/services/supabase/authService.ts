import { supabase, isValidUUID } from '../../lib/supabase';
import { UserProfile, UserRole } from '../../types';
import { getProfileById, upsertProfile, subscribeToProfileInSupabase } from './profileService';

export interface AuthResponse {
  user: UserProfile | null;
  error: string | null;
}

// Session Persistence helpers
const SESSION_STORAGE_KEY = 'iproom_nepal_user_session';

export const saveUserSession = (profile: UserProfile | null) => {
  try {
    if (profile && isValidUUID(profile.id)) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch (e) {
    console.warn('LocalStorage save notice:', e);
  }
};

export const getStoredUserSession = (): UserProfile | null => {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && isValidUUID(parsed.id)) {
      return parsed;
    }
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  } catch (e) {
    return null;
  }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  if (!isValidUUID(uid)) return null;
  return await getProfileById(uid);
};

export const subscribeToUserProfile = (
  uid: string,
  onUpdate: (profile: UserProfile) => void
): (() => void) => {
  if (!isValidUUID(uid)) return () => {};
  return subscribeToProfileInSupabase(uid, onUpdate);
};

/**
 * Sign In with Google via Supabase OAuth
 * Supports iframe popup fallback to prevent X-Frame-Options blocking
 */
export const loginWithGoogle = async (defaultRole: UserRole = 'renter'): Promise<void> => {
  localStorage.setItem('iproom_pending_oauth_role', defaultRole);
  const redirectTo = window.location.origin;

  const inIframe = typeof window !== 'undefined' && window.self !== window.top;
  if (inIframe) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      throw new Error(error.message || 'Google sign-in could not be started.');
    }

    if (data?.url) {
      const popup = window.open(
        data.url,
        'supabase_google_signin',
        'width=500,height=650,left=150,top=100,status=no,toolbar=no,menubar=no'
      );
      if (!popup || popup.closed) {
        window.top!.location.href = data.url;
      }
      return;
    }
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  });

  if (error) {
    throw new Error(error.message || 'Google sign-in could not be started.');
  }
};

/**
 * Sign In with Facebook via Supabase OAuth
 */
export const loginWithFacebook = async (defaultRole: UserRole = 'renter'): Promise<void> => {
  localStorage.setItem('iproom_pending_oauth_role', defaultRole);
  const redirectTo = window.location.origin;

  const inIframe = typeof window !== 'undefined' && window.self !== window.top;
  if (inIframe) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw new Error(error.message || 'Facebook sign-in could not be started.');
    if (data?.url) {
      const popup = window.open(
        data.url,
        'supabase_fb_signin',
        'width=500,height=650,left=150,top=100,status=no,toolbar=no,menubar=no'
      );
      if (!popup || popup.closed) {
        window.top!.location.href = data.url;
      }
      return;
    }
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: {
      redirectTo,
    },
  });

  if (error) {
    throw new Error(error.message || 'Facebook sign-in could not be started.');
  }
};

/**
 * Called once on app startup after an OAuth redirect (Google/Facebook) completes in Supabase.
 */
export const ensureProfileAfterOAuthRedirect = async (): Promise<UserProfile | null> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user || !isValidUUID(session.user.id)) {
      return null;
    }

    const user = session.user;
    const isSuperAdmin = (user.email || '').trim().toLowerCase() === 'cainarjit@gmail.com';
    let existing = await getProfileById(user.id);

    if (existing) {
      if (isSuperAdmin && existing.role !== 'admin') {
        existing = { ...existing, role: 'admin', verified: true };
        await upsertProfile(existing);
      }
      saveUserSession(existing);

      if (typeof window !== 'undefined' && (window.location.hash.includes('access_token=') || window.location.search.includes('code='))) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      return existing;
    }

    const pendingRole = (localStorage.getItem('iproom_pending_oauth_role') as UserRole) || (isSuperAdmin ? 'admin' : 'renter');
    localStorage.removeItem('iproom_pending_oauth_role');

    const meta: any = user.user_metadata || {};
    const fullName = meta.full_name || meta.name || user.email?.split('@')[0] || 'IP Room User';
    const profile: UserProfile = {
      id: user.id,
      name: fullName,
      email: user.email || '',
      phone: meta.phone || '+977 98XXXXXXXX',
      role: isSuperAdmin ? 'admin' : pendingRole,
      avatar:
        meta.avatar_url ||
        meta.picture ||
        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
      verified: isSuperAdmin || pendingRole === 'renter',
      citizenshipVerified: pendingRole === 'owner',
      university: pendingRole === 'renter' ? 'Tribhuvan University (Central Campus)' : undefined,
      studentIdVerified: pendingRole === 'renter',
    };

    await upsertProfile(profile);
    saveUserSession(profile);

    if (typeof window !== 'undefined' && (window.location.hash.includes('access_token=') || window.location.search.includes('code='))) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    return profile;
  } catch (err) {
    console.warn('Error during ensureProfileAfterOAuthRedirect:', err);
    return null;
  }
};

/**
 * Register with Email & Password via Supabase Auth
 */
export const registerWithEmail = async (
  email: string,
  pass: string,
  name: string,
  role: UserRole = 'renter',
  phone: string,
  university?: string
): Promise<UserProfile> => {
  const res = await signUpWithEmail(email, pass, name, role, phone, university);
  if (res.error || !res.user) {
    throw new Error(res.error || 'Registration failed.');
  }
  saveUserSession(res.user);
  return res.user;
};

/**
 * Sign In with Email & Password via Supabase Auth
 */
export const loginWithEmail = async (email: string, pass: string): Promise<UserProfile> => {
  const res = await signInWithEmail(email, pass);
  if (res.error || !res.user) {
    throw new Error(res.error || 'Invalid email or password.');
  }
  saveUserSession(res.user);
  return res.user;
};

export const logoutUser = async (): Promise<void> => {
  await signOutUser();
  saveUserSession(null);
};

/**
 * Sign up a new user using email and password.
 * Default role is 'renter'. Normal users cannot assign themselves 'admin'.
 */
export const signUpWithEmail = async (
  email: string,
  pass: string,
  fullName: string,
  role: UserRole = 'renter',
  phone?: string,
  university?: string
): Promise<AuthResponse> => {
  try {
    // Normal users cannot directly make themselves admin
    const assignedRole: UserRole = role === 'admin' ? 'renter' : role;

    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          full_name: fullName,
          role: assignedRole,
          phone: phone || null,
          university: university || null,
        },
      },
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (data.user) {
      const userProfile: UserProfile = {
        id: data.user.id,
        name: fullName,
        email: data.user.email || email,
        phone: phone || '+977 98XXXXXXXX',
        role: assignedRole,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
        verified: false,
        citizenshipVerified: false,
        university: assignedRole === 'renter' ? university : undefined,
        studentIdVerified: false,
      };

      // Persist profile
      await upsertProfile(userProfile);
      return { user: userProfile, error: null };
    }

    return { user: null, error: 'Registration completed. Please verify your email.' };
  } catch (err: any) {
    return { user: null, error: err?.message || 'An unexpected registration error occurred.' };
  }
};

/**
 * Sign in using email and password
 */
export const signInWithEmail = async (
  email: string,
  pass: string
): Promise<AuthResponse> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (data.user) {
      let existingProfile = await getProfileById(data.user.id);
      if (!existingProfile) {
        await new Promise(r => setTimeout(r, 300));
        existingProfile = await getProfileById(data.user.id);
      }

      if (existingProfile) {
        return { user: existingProfile, error: null };
      }

      const isCainarjitAdmin = (data.user.email || email).trim().toLowerCase() === 'cainarjit@gmail.com';
      const resolvedRole: UserRole = isCainarjitAdmin
        ? 'admin'
        : ((data.user.user_metadata?.role as UserRole) || 'renter');

      // Fallback construct if profile row not yet created
      const fallbackProfile: UserProfile = {
        id: data.user.id,
        name: data.user.user_metadata?.full_name || email.split('@')[0],
        email: data.user.email || email,
        phone: data.user.user_metadata?.phone || '+977 98XXXXXXXX',
        role: resolvedRole,
        avatar:
          data.user.user_metadata?.avatar_url ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(email)}`,
        verified: isCainarjitAdmin,
      };

      await upsertProfile(fallbackProfile);
      return { user: fallbackProfile, error: null };
    }

    return { user: null, error: 'User could not be found.' };
  } catch (err: any) {
    return { user: null, error: err?.message || 'Failed to sign in.' };
  }
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (
  email: string
): Promise<{ success: boolean; error: string | null }> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#reset-password`,
    });
    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to send password reset email.' };
  }
};

/**
 * Update user password
 */
export const updatePassword = async (
  newPassword: string
): Promise<{ success: boolean; error: string | null }> => {
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update password.' };
  }
};

/**
 * Sign out current user
 */
export const signOutUser = async (): Promise<void> => {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('Error during Supabase signOut:', err);
  }
};

/**
 * Get current session & user profile
 */
export const getCurrentUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user) return null;
    let profile = await getProfileById(session.user.id);
    if (!profile) {
      const isSuperAdmin = (session.user.email || '').trim().toLowerCase() === 'cainarjit@gmail.com';
      const meta: any = session.user.user_metadata || {};
      const fullName = meta.full_name || meta.name || session.user.email?.split('@')[0] || 'IP Room User';
      const assignedRole: UserRole = isSuperAdmin ? 'admin' : ((meta.role as UserRole) || 'renter');

      profile = {
        id: session.user.id,
        name: fullName,
        email: session.user.email || '',
        phone: meta.phone || '+977 98XXXXXXXX',
        role: assignedRole,
        avatar: meta.avatar_url || meta.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
        verified: isSuperAdmin,
        citizenshipVerified: false,
        university: assignedRole === 'renter' ? 'Tribhuvan University (Central Campus)' : undefined,
        studentIdVerified: false,
      };
      await upsertProfile(profile);
    }
    return profile;
  } catch (err) {
    console.warn('Error getting current user profile:', err);
    return null;
  }
};

/**
 * Auth state listener with automatic profile synthesis for Google OAuth redirects
 */
export const onAuthStateChange = (
  callback: (user: UserProfile | null) => void
): (() => void) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      let profile = await getProfileById(session.user.id);
      if (!profile) {
        const isSuperAdmin = (session.user.email || '').trim().toLowerCase() === 'cainarjit@gmail.com';
        const pendingRole = (localStorage.getItem('iproom_pending_oauth_role') as UserRole) || (isSuperAdmin ? 'admin' : 'renter');
        const meta: any = session.user.user_metadata || {};
        const fullName = meta.full_name || meta.name || session.user.email?.split('@')[0] || 'IP Room User';
        const assignedRole: UserRole = isSuperAdmin ? 'admin' : (meta.role as UserRole) || pendingRole;

        profile = {
          id: session.user.id,
          name: fullName,
          email: session.user.email || '',
          phone: meta.phone || '+977 98XXXXXXXX',
          role: assignedRole,
          avatar: meta.avatar_url || meta.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
          verified: isSuperAdmin,
          citizenshipVerified: false,
          university: assignedRole === 'renter' ? 'Tribhuvan University (Central Campus)' : undefined,
          studentIdVerified: false,
        };
        // Persist profile asynchronously in background
        upsertProfile(profile).catch(e => console.warn('Background profile sync notice:', e));
      } else if ((session.user.email || '').trim().toLowerCase() === 'cainarjit@gmail.com' && profile.role !== 'admin') {
        profile = { ...profile, role: 'admin', verified: true };
        upsertProfile(profile).catch(e => console.warn('Background profile sync notice:', e));
      }
      callback(profile);
    } else if (event === 'SIGNED_OUT') {
      callback(null);
    }
  });

  return () => {
    subscription.unsubscribe();
  };
};

