import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import {
  UserProfile,
  UserRole,
  RoomListing,
  BookingRequest,
  ModerationLogEntry,
  ListingStatus,
} from '../types';

// Load config for Firebase
import firebaseConfig from '../../firebase-applet-config.json';

// Supabase client and service methods
import {
  supabase,
  isValidUUID,
  stringToUUID,
  saveProfileToSupabase,
  getProfileFromSupabase,
  getProfileByEmailFromSupabase,
  subscribeToProfileInSupabase,
  fetchRoomsFromSupabase,
  saveRoomToSupabase,
  updateRoomStatusInSupabase,
  deleteRoomFromSupabase,
  saveBookingToSupabase,
  fetchBookingsFromSupabase,
  updateBookingStatusInSupabase,
  recordModerationLogInSupabase,
  fetchModerationLogsFromSupabase,
  mapProfileFromRow,
} from './supabase';

// Re-export Supabase tools so consumers can use either service
export * from './supabase';

// Initialize Firebase App for Push Notifications (FCM) compatibility ONLY.
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Kept for FCM push notification service registration ONLY.
export const auth = getAuth(app);

// Firestore instance preserved for FCM messaging references
export const db = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId || 'ai-studio-iproomnepalsstud-8e60d682-a464-42fa-9f61-7fcc5acc576c'
);

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

/**
 * Fetch User Profile Document from Supabase
 */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  if (!isValidUUID(uid)) return null;
  return await getProfileFromSupabase(uid);
};

/**
 * Real-time subscription to user profile in Supabase
 */
export const subscribeToUserProfile = (
  uid: string,
  onUpdate: (profile: UserProfile) => void
): (() => void) => {
  if (!isValidUUID(uid)) return () => {};
  return subscribeToProfileInSupabase(uid, onUpdate);
};

/**
 * Sign In with Google via Firebase Auth (Popup flow - optimal for iframes and Cloud Run)
 * Creates or retrieves user profile with selected role ('renter' or 'owner', or 'admin' for cainarjit@gmail.com).
 */
export const loginWithGoogle = async (defaultRole: UserRole = 'renter'): Promise<UserProfile> => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;

    const email = (user.email || '').trim().toLowerCase();
    const isSuperAdmin = email === 'cainarjit@gmail.com';
    const assignedRole: UserRole = isSuperAdmin ? 'admin' : (defaultRole === 'admin' ? 'renter' : defaultRole);

    // Compute deterministic valid RFC 4122 UUID from user's Firebase UID or email
    const userUUID = stringToUUID(user.uid || email);

    // Check if profile already exists in Supabase
    let existingProfile = await getProfileFromSupabase(userUUID);
    if (!existingProfile && email) {
      existingProfile = await getProfileByEmailFromSupabase(email);
    }

    if (existingProfile) {
      const updatedProfile: UserProfile = {
        ...existingProfile,
        name: existingProfile.name || user.displayName || email.split('@')[0] || 'IP Room User',
        avatar:
          existingProfile.avatar ||
          user.photoURL ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.displayName || 'User')}`,
        role: isSuperAdmin ? 'admin' : existingProfile.role,
        verified: isSuperAdmin ? true : existingProfile.verified,
      };

      try {
        await saveProfileToSupabase(updatedProfile);
      } catch (err) {
        console.warn('Profile sync notice:', err);
      }

      saveUserSession(updatedProfile);
      return updatedProfile;
    }

    // Create fresh profile with requested role (renter or owner)
    const displayName = user.displayName || (email ? email.split('@')[0] : 'IP Room User');
    const newProfile: UserProfile = {
      id: userUUID,
      name: displayName,
      email: user.email || '',
      phone: user.phoneNumber || '+977 98XXXXXXXX',
      role: assignedRole,
      avatar:
        user.photoURL ||
        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`,
      verified: isSuperAdmin || assignedRole === 'renter',
      citizenshipVerified: assignedRole === 'owner',
      university: assignedRole === 'renter' ? 'Tribhuvan University (Central Campus)' : undefined,
      studentIdVerified: assignedRole === 'renter',
    };

    try {
      await saveProfileToSupabase(newProfile);
    } catch (err) {
      console.warn('Profile save notice:', err);
    }

    saveUserSession(newProfile);
    return newProfile;
  } catch (error: any) {
    console.error('Firebase Google Sign-In error:', error);
    if (error?.code === 'auth/popup-closed-by-user') {
      throw new Error('Google sign-in was cancelled. Please try again.');
    }
    if (error?.code === 'auth/popup-blocked') {
      throw new Error('Pop-up was blocked by browser. Please allow popups for this site and try again.');
    }
    if (error?.code === 'auth/cancelled-popup-request') {
      throw new Error('Another sign-in window is already open. Please complete or close it.');
    }
    throw new Error(error?.message || 'Google sign-in could not be completed. Please try again.');
  }
};

/**
 * Sign In with Facebook via Supabase OAuth (Redirect flow)
 */
export const loginWithFacebook = async (defaultRole: UserRole = 'renter'): Promise<void> => {
  localStorage.setItem('iproom_pending_oauth_role', defaultRole);
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) {
    throw new Error(error.message || 'Facebook sign-in could not be started.');
  }
};

/**
 * Called once on app startup after an OAuth redirect (Google/Facebook) completes.
 * Uses the real Supabase Auth session user ID and synthesizes profile if not yet created.
 */
export const ensureProfileAfterOAuthRedirect = async (): Promise<UserProfile | null> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user || !isValidUUID(session.user.id)) {
      return null;
    }

    const user = session.user;
    const isSuperAdmin = (user.email || '').trim().toLowerCase() === 'cainarjit@gmail.com';
    let existing = await getProfileFromSupabase(user.id);

    if (existing) {
      if (isSuperAdmin && existing.role !== 'admin') {
        existing = { ...existing, role: 'admin', verified: true };
        await saveProfileToSupabase(existing);
      }
      saveUserSession(existing);

      // Clean up OAuth hash/code from address bar
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

    await saveProfileToSupabase(profile);
    saveUserSession(profile);

    // Clean up OAuth hash/code from address bar
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
  const assignedRole: UserRole = role === 'admin' ? 'renter' : role;

  const { data, error } = await supabase.auth.signUp({
    email,
    password: pass,
    options: {
      data: {
        name,
        full_name: name,
        role: assignedRole,
        phone,
        university: assignedRole === 'renter' ? university : undefined,
      },
    },
  });

  if (error) {
    throw new Error(error.message || 'Could not create account.');
  }
  if (!data?.user?.id) {
    throw new Error('Signup did not return a valid user. Please check your email for verification.');
  }

  const uid = data.user.id;
  const profile: UserProfile = {
    id: uid,
    name,
    email,
    phone,
    role: assignedRole,
    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
    verified: false,
    citizenshipVerified: false,
    university: assignedRole === 'renter' ? university : undefined,
    studentIdVerified: false,
  };

  await saveProfileToSupabase(profile);
  saveUserSession(profile);
  return profile;
};

/**
 * Sign In with Email & Password via Supabase Auth
 */
export const loginWithEmail = async (email: string, pass: string): Promise<UserProfile> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: pass,
  });

  if (error) {
    throw new Error(error.message || 'Invalid email or password.');
  }

  if (data?.user) {
    const isCainarjitAdmin = email.trim().toLowerCase() === 'cainarjit@gmail.com';

    // 1. First attempt to read profile by user UUID
    let stored = await getProfileFromSupabase(data.user.id);
    if (!stored) {
      // Retry once after brief delay to allow trigger creation
      await new Promise(resolve => setTimeout(resolve, 300));
      stored = await getProfileFromSupabase(data.user.id);
    }

    if (stored) {
      // Enforce admin privileges for designated admin
      if (isCainarjitAdmin && stored.role !== 'admin') {
        stored = { ...stored, role: 'admin', verified: true };
        await saveProfileToSupabase(stored);
      }
      saveUserSession(stored);
      return stored;
    }

    // Determine role (admin for designated admin account, or user_metadata, or renter)
    const resolvedRole: UserRole = isCainarjitAdmin
      ? 'admin'
      : ((data.user.user_metadata?.role as UserRole) || 'renter');

    // Auth succeeded, create/sync profile row with authentic Supabase user id
    const newProfile: UserProfile = {
      id: data.user.id,
      name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || email.split('@')[0],
      email: data.user.email || email.trim(),
      phone: data.user.user_metadata?.phone || '+977 98XXXXXXXX',
      role: resolvedRole,
      avatar:
        data.user.user_metadata?.avatar_url ||
        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(email)}`,
      verified: isCainarjitAdmin,
    };
    await saveProfileToSupabase(newProfile);
    saveUserSession(newProfile);
    return newProfile;
  }

  throw new Error('Sign-in failed. Please verify credentials.');
};

/**
 * Logout user from Firebase and Supabase
 */
export const logoutUser = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (e) {
    console.warn('Firebase signOut notice:', e);
  }
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn('Supabase signOut notice:', e);
  }
  saveUserSession(null);
};

/**
 * Fetch all rooms from Supabase
 */
export const fetchRoomsFromFirestore = async (): Promise<RoomListing[]> => {
  return await fetchRoomsFromSupabase();
};

/**
 * Save or update a room listing in Supabase
 */
export const saveRoomToFirestore = async (room: RoomListing): Promise<void> => {
  await saveRoomToSupabase(room);
};

/**
 * Update room listing status in Supabase
 */
export const updateRoomStatusInFirestore = async (
  roomId: string,
  newStatus: ListingStatus,
  extraFields: Record<string, any> = {}
): Promise<void> => {
  await updateRoomStatusInSupabase(roomId, newStatus, extraFields);
};

/**
 * Permanently delete a room from Supabase
 */
export const deleteRoomFromFirestore = async (roomId: string): Promise<void> => {
  await deleteRoomFromSupabase(roomId);
};

/**
 * Record moderation log entry to Supabase
 */
export const recordModerationLog = async (
  entry: Omit<ModerationLogEntry, 'id' | 'timestamp'>
): Promise<ModerationLogEntry> => {
  return await recordModerationLogInSupabase(entry);
};

/**
 * Fetch moderation logs from Supabase
 */
export const fetchModerationLogs = async (): Promise<ModerationLogEntry[]> => {
  return await fetchModerationLogsFromSupabase();
};
