import { supabase, isValidUUID, getAuthenticatedSessionUser } from '../../lib/supabase';
import { UserProfile, UserRole } from '../../types';

export const mapProfileRowToModel = (row: any): UserProfile => ({
  id: row.id,
  name: row.name || row.full_name || 'IP Room User',
  email: row.email,
  phone: row.phone || '',
  role: (row.role as UserRole) || 'renter',
  avatar:
    row.avatar ||
    row.avatar_url ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(row.name || row.full_name || 'User')}`,
  verified: Boolean(row.is_verified),
  citizenshipVerified: Boolean(row.citizenship_verified),
  personalDetails: {
    dateOfBirth: row.date_of_birth || undefined,
    gender: row.gender || undefined,
    permanentAddress: row.address || undefined,
    currentAddress: row.address || undefined,
    province: row.province || undefined,
    district: row.district || undefined,
    municipality: row.municipality || undefined,
    areaLandmark: row.bio || undefined,
  },
});

export const getProfileById = async (id: string | null | undefined): Promise<UserProfile | null> => {
  if (!isValidUUID(id)) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id as string)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching profile from Supabase:', error.message);
      return null;
    }

    return data ? mapProfileRowToModel(data) : null;
  } catch (err: any) {
    console.warn('Exception in getProfileById:', err?.message);
    return null;
  }
};

export const upsertProfile = async (profile: UserProfile): Promise<boolean> => {
  if (!isValidUUID(profile.id)) {
    return false;
  }

  try {
    const updateData: Record<string, any> = {
      id: profile.id,
      name: profile.name,
      full_name: profile.name,
      email: profile.email,
      phone: profile.phone || null,
      avatar: profile.avatar || null,
      avatar_url: profile.avatar || null,
      role: profile.role,
      is_verified: profile.verified ?? false,
      verified: profile.verified ?? false,
      citizenship_verified: profile.citizenshipVerified || false,
      university: profile.university || null,
      personal_details: profile.personalDetails || null,
      identity_verification: profile.identityVerification || null,
      updated_at: new Date().toISOString(),
    };

    let { error } = await supabase
      .from('profiles')
      .upsert(updateData as any, { onConflict: 'id' });

    // If PostgREST schema cache complains about a missing column, strip that column and retry
    while (error && error.message?.includes('schema cache')) {
      const match = error.message.match(/Could not find the '([^']+)' column/);
      if (match && match[1] && updateData[match[1]] !== undefined) {
        delete updateData[match[1]];
        const retryResult = await supabase
          .from('profiles')
          .upsert(updateData as any, { onConflict: 'id' });
        error = retryResult.error;
      } else {
        break;
      }
    }

    // Fallback to minimal core columns if schema differs
    if (error && error.message?.includes('schema cache')) {
      const minimalData: Record<string, any> = {
        id: profile.id,
        full_name: profile.name,
        email: profile.email,
        role: profile.role,
      };
      if (profile.phone) minimalData.phone = profile.phone;
      if (profile.avatar) minimalData.avatar_url = profile.avatar;
      const minimalRetry = await supabase
        .from('profiles')
        .upsert(minimalData as any, { onConflict: 'id' });
      error = minimalRetry.error;
    }

    if (error) {
      console.warn('Supabase upsertProfile notice:', error.message);
      return false;
    }

    return true;
  } catch (err: any) {
    console.warn('Exception in upsertProfile:', err?.message);
    return false;
  }
};

/**
 * Upload avatar image to Supabase Storage 'avatars' bucket
 */
export const uploadAvatar = async (
  userId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> => {
  if (!isValidUUID(userId)) {
    return { url: null, error: 'Valid user UUID required for upload.' };
  }

  const authUser = await getAuthenticatedSessionUser();
  if (!authUser || authUser.id !== userId) {
    return { url: null, error: 'Authentication required for avatar upload.' };
  }

  try {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `${userId}/avatar-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      return { url: null, error: uploadError.message };
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return { url: data.publicUrl, error: null };
  } catch (err: any) {
    return { url: null, error: err?.message || 'Failed to upload avatar.' };
  }
};

/**
 * Upload identity verification document to Supabase Storage 'id-documents' bucket (private)
 */
export const uploadKycDocument = async (
  userId: string,
  file: File,
  docType: string
): Promise<{ storagePath: string | null; error: string | null }> => {
  if (!isValidUUID(userId)) {
    return { storagePath: null, error: 'Valid user UUID required for document upload.' };
  }

  const authUser = await getAuthenticatedSessionUser();
  if (!authUser || authUser.id !== userId) {
    return { storagePath: null, error: 'Authentication required for document upload.' };
  }

  try {
    const fileExt = file.name.split('.').pop() || 'pdf';
    const filePath = `${userId}/${docType}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('id-documents')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      return { storagePath: null, error: uploadError.message };
    }

    return { storagePath: filePath, error: null };
  } catch (err: any) {
    return { storagePath: null, error: err?.message || 'Failed to upload document.' };
  }
};

/**
 * Realtime subscription to profile updates
 */
export const subscribeToProfile = (
  userId: string,
  callback: (profile: UserProfile) => void
): (() => void) => {
  if (!isValidUUID(userId)) {
    return () => {};
  }

  const channelName = `profile-${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new) {
          callback(mapProfileRowToModel(payload.new));
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const subscribeToProfileInSupabase = subscribeToProfile;
