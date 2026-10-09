import {
  UserProfile,
  RoomListing,
  BookingRequest,
  ModerationLogEntry,
  UserRole,
  ListingStatus,
  DisputeTicket,
} from '../types';
import { supabase, isValidUUID, stringToUUID, getAuthenticatedSessionUser } from '../lib/supabase';
import {
  getLocalStoredRooms,
  persistRoomLocally,
  removeRoomLocally,
  syncAllRoomsLocally,
} from './roomStorage';

// Re-export all modular Supabase services
export * from './supabase/index';
export { supabase, isValidUUID, stringToUUID, getAuthenticatedSessionUser };

export const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  (import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string) ||
  'https://stygqxxldbegjilpzlco.supabase.co';

export const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  (import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string) ||
  'sb_publishable_nxl9JQoEpOUMh0CC42XK6Q_k8rju9C3';

/**
 * Generates a valid standard RFC 4122 v4 UUID
 */
export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/* =========================================================================
   Data Mappers (safely map snake_case Postgres columns <-> camelCase TS models)
   ========================================================================= */

export const mapProfileFromRow = (row: any): UserProfile => ({
  id: String(row.id),
  name: row.name || row.full_name || 'IP Room User',
  email: row.email || '',
  phone: row.phone || '+977 98XXXXXXXX',
  role: (row.role as UserRole) || 'renter',
  avatar:
    row.avatar ||
    row.avatar_url ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(row.name || row.full_name || 'User')}`,
  verified: row.verified !== undefined ? Boolean(row.verified) : Boolean(row.is_verified),
  citizenshipVerified: Boolean(row.citizenship_verified ?? row.citizenshipVerified),
  university: row.university || undefined,
  studentIdVerified: Boolean(row.student_id_verified ?? row.studentIdVerified),
  personalDetails: row.personal_details ?? row.personalDetails ?? {
    dateOfBirth: row.date_of_birth || undefined,
    gender: row.gender || undefined,
    permanentAddress: row.address || undefined,
    currentAddress: row.address || undefined,
    province: row.province || undefined,
    district: row.district || undefined,
    municipality: row.municipality || undefined,
    areaLandmark: row.bio || undefined,
  },
  identityVerification: row.identity_verification ?? row.identityVerification,
});

export const mapProfileToRow = (profile: UserProfile): Record<string, any> => {
  const details = profile.personalDetails || {};
  return {
    id: profile.id,
    full_name: profile.name,
    email: profile.email,
    phone: profile.phone || null,
    role: profile.role,
    avatar: profile.avatar || null,
    avatar_url: profile.avatar || null,
    verified: profile.verified ?? false,
    is_verified: profile.verified ?? false,
    citizenship_verified: Boolean(profile.citizenshipVerified),
    university: profile.university || null,
    student_id_verified: Boolean(profile.studentIdVerified),
    gender: details.gender || null,
    date_of_birth: details.dateOfBirth || null,
    address: details.permanentAddress || details.currentAddress || null,
    province: details.province || null,
    district: details.district || null,
    municipality: details.municipality || null,
    bio: details.areaLandmark || null,
    identity_verification: profile.identityVerification || null,
    updated_at: new Date().toISOString(),
  };
};

export const mapRoomFromRow = (row: any): RoomListing => ({
  id: String(row.id),
  title: row.title || 'Verified Room in Nepal',
  titleNp: row.title_np || row.titleNp || row.title || 'नेपालमा कोठा',
  description: row.description || '',
  descriptionNp: row.description_np || row.descriptionNp || row.description || '',
  price: Number(row.price || 0),
  deposit: Number(row.deposit || row.security_deposit || 0),
  roomType: row.room_type || row.roomType || 'single',
  occupancyPreference: row.occupancy_preference || row.occupancyPreference || 'any',
  images: Array.isArray(row.images)
    ? row.images
    : typeof row.images === 'string'
      ? JSON.parse(row.images)
      : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80'],
  virtualTour: row.virtual_tour || row.virtualTour || undefined,
  location:
    typeof row.location === 'string'
      ? JSON.parse(row.location)
      : row.location || {
          province: row.province || 'Bagmati Province',
          provinceId: 3,
          district: row.district || 'Kathmandu',
          municipality: row.municipality || 'Kathmandu Metropolitan',
          ward: Number(row.ward || 10),
          areaLandmark: row.area || 'Near Campus',
          fullAddress: row.address || 'Kathmandu, Nepal',
          lat: Number(row.latitude || 27.7172),
          lng: Number(row.longitude || 85.324),
        },
  amenities:
    typeof row.amenities === 'string'
      ? JSON.parse(row.amenities)
      : row.amenities || {
          wifi: true,
          water24x7: true,
          hotWaterSolar: false,
          attachedBathroom: false,
          kitchenFacility: true,
          bikeParking: true,
          carParking: false,
          balcony: false,
          furnished: false,
          electricityBackup: true,
          cctvSecurity: false,
        },
  houseRules: Array.isArray(row.house_rules)
    ? row.house_rules
    : Array.isArray(row.houseRules)
      ? row.houseRules
      : ['Gate closes at 10 PM'],
  houseRulesNp: Array.isArray(row.house_rules_np)
    ? row.house_rules_np
    : Array.isArray(row.houseRulesNp)
      ? row.houseRulesNp
      : ['राति १० बजे गेट बन्द हुने'],
  waterSchedule: row.water_schedule || row.waterSchedule || '24/7 Supply',
  electricityRatePerUnit: Number(row.electricity_rate_per_unit || row.electricityRatePerUnit || 15),
  owner:
    typeof row.owner === 'string'
      ? JSON.parse(row.owner)
      : row.owner || {
          id: isValidUUID(row.owner_id) ? row.owner_id : generateUUID(),
          name: row.profiles?.full_name || row.profiles?.name || 'Verified Landlord',
          phone: row.profiles?.phone || '+977 9841234567',
          whatsapp: row.profiles?.phone || '+977 9841234567',
          verified: true,
          superHost: true,
          citizenshipVerified: true,
          responseRate: '100%',
          responseTime: 'within 1 hour',
          avatar:
            row.profiles?.avatar_url ||
            row.profiles?.avatar ||
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
        },
  ratings:
    typeof row.ratings === 'string'
      ? JSON.parse(row.ratings)
      : row.ratings || { average: 5.0, count: 1 },
  reviews: Array.isArray(row.reviews)
    ? row.reviews
    : typeof row.reviews === 'string'
      ? JSON.parse(row.reviews)
      : [],
  availableFrom: row.available_from || row.availableFrom || new Date().toISOString().split('T')[0],
  floor: row.floor || `${row.floor_number || 1} Floor`,
  featured: Boolean(row.featured || row.is_featured),
  status: (row.status as ListingStatus) || 'approved',
  rejectionReason: row.rejection_reason || row.rejectionReason || undefined,
  moderatedAt: row.moderated_at || row.moderatedAt || undefined,
  moderatedBy: row.moderated_by || row.moderatedBy || undefined,
  createdAt: row.created_at || row.createdAt || new Date().toISOString(),
});

export const mapRoomToRow = (room: RoomListing): Record<string, any> => {
  const safeId = isValidUUID(room.id) ? room.id : generateUUID();

  // Validate DATE column format (YYYY-MM-DD) for PostgreSQL
  let safeAvailableFrom: string = new Date().toISOString().split('T')[0];
  if (room.availableFrom && /^\d{4}-\d{2}-\d{2}$/.test(room.availableFrom.trim())) {
    safeAvailableFrom = room.availableFrom.trim();
  }

  const safeOwnerId = isValidUUID(room.owner?.id) ? room.owner.id : null;

  return {
    id: safeId,
    title: room.title || 'Clean Room in Nepal',
    title_np: room.titleNp || room.title || 'नेपालमा कोठा',
    description: room.description || '',
    description_np: room.descriptionNp || room.description || '',
    price: Number(room.price || 0),
    deposit: Number(room.deposit || 0),
    room_type: room.roomType || 'single',
    occupancy_preference: room.occupancyPreference || 'any',
    district: room.location?.district || 'Kathmandu',
    address: room.location?.fullAddress || 'Kathmandu, Nepal',
    latitude: Number(room.location?.lat || 27.7172),
    longitude: Number(room.location?.lng || 85.324),
    location: room.location || {},
    images: Array.isArray(room.images) && room.images.length > 0 ? room.images : [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80'
    ],
    virtual_tour: room.virtualTour || null,
    amenities: room.amenities || {},
    house_rules: room.houseRules || ['Gate closes at 10 PM'],
    house_rules_np: room.houseRulesNp || ['राति १० बजे गेट बन्द हुने'],
    water_schedule: room.waterSchedule || '24/7 Supply',
    electricity_rate_per_unit: Number(room.electricityRatePerUnit || 15),
    owner: room.owner || {},
    owner_id: safeOwnerId,
    ratings: room.ratings || { average: 5.0, count: 1 },
    reviews: room.reviews || [],
    available_from: safeAvailableFrom,
    floor: room.floor || '1st Floor',
    featured: Boolean(room.featured),
    status: room.status === 'pending' || !room.status ? 'approved' : room.status,
    rejection_reason: room.rejectionReason || null,
    moderated_at: room.moderatedAt || null,
    moderated_by: isValidUUID(room.moderatedBy) ? room.moderatedBy : null,
    created_at: room.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

export const mapBookingFromRow = (row: any): BookingRequest => ({
  id: String(row.id),
  roomId: row.room_id || row.roomId,
  roomTitle: row.room_title || row.roomTitle || row.room_listings?.title || 'Room in Nepal',
  roomAddress: row.room_address || row.roomAddress || row.room_listings?.address || 'Kathmandu, Nepal',
  roomPrice: Number(row.room_price || row.roomPrice || row.monthly_rent || 0),
  roomImage:
    row.room_image ||
    row.roomImage ||
    row.room_listings?.room_images?.[0]?.image_url ||
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
  tenantId: row.tenant_id || row.tenantId || row.renter_id,
  tenantName: row.tenant_name || row.tenantName || row.renter?.full_name || 'Student / Renter',
  tenantPhone: row.tenant_phone || row.tenantPhone || row.renter?.phone || '+977 98XXXXXXXX',
  tenantEmail: row.tenant_email || row.tenantEmail || row.renter?.email || '',
  tenantUniversity: row.tenant_university || row.tenantUniversity || undefined,
  ownerId: row.owner_id || row.ownerId,
  moveInDate: row.move_in_date || row.moveInDate,
  durationMonths: Number(row.duration_months || row.durationMonths || 1),
  totalMonthlyRent: Number(row.total_monthly_rent || row.totalMonthlyRent || row.monthly_rent || 0),
  securityDeposit: Number(row.security_deposit || row.securityDeposit || 0),
  totalPaid: Number(row.total_paid || row.totalPaid || 0),
  paymentMethod: row.payment_method || row.paymentMethod || 'khalti',
  paymentRefId: row.payment_ref_id || row.paymentRefId || '',
  status:
    row.status === 'accepted'
      ? 'confirmed'
      : row.status === 'rejected'
        ? 'cancelled'
        : row.status || 'pending_approval',
  contractGenerated: Boolean(row.contract_generated ?? row.contractGenerated ?? (row.status === 'accepted')),
  createdAt: row.created_at || row.createdAt || new Date().toISOString(),
});

export const mapBookingToRow = (booking: BookingRequest): Record<string, any> => {
  const safeId = isValidUUID(booking.id) ? booking.id : generateUUID();
  const safeRoomId = isValidUUID(booking.roomId) ? booking.roomId : null;
  const safeRenterId = isValidUUID(booking.tenantId) ? booking.tenantId : null;
  const safeOwnerId = isValidUUID(booking.ownerId) ? booking.ownerId : null;

  return {
    id: safeId,
    room_id: safeRoomId,
    renter_id: safeRenterId,
    tenant_id: safeRenterId,
    owner_id: safeOwnerId,
    room_title: booking.roomTitle,
    room_address: booking.roomAddress,
    room_price: booking.roomPrice,
    room_image: booking.roomImage,
    tenant_name: booking.tenantName,
    tenant_phone: booking.tenantPhone,
    tenant_email: booking.tenantEmail,
    tenant_university: booking.tenantUniversity || null,
    move_in_date: booking.moveInDate,
    duration_months: booking.durationMonths,
    monthly_rent: booking.totalMonthlyRent,
    total_monthly_rent: booking.totalMonthlyRent,
    security_deposit: booking.securityDeposit,
    total_paid: booking.totalPaid,
    payment_method: booking.paymentMethod,
    payment_ref_id: booking.paymentRefId,
    status: booking.status,
    contract_generated: Boolean(booking.contractGenerated),
    created_at: booking.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

export const mapLogFromRow = (row: any): ModerationLogEntry => ({
  id: String(row.id),
  listingId: row.listing_id || row.listingId,
  listingTitle: row.listing_title || row.listingTitle,
  action: row.action,
  previousStatus: row.previous_status || row.previousStatus,
  newStatus: row.new_status || row.newStatus,
  moderatorId: row.moderator_id || row.moderatorId,
  moderatorName: row.moderator_name || row.moderatorName,
  reason: row.reason || undefined,
  timestamp: row.timestamp || row.created_at || new Date().toISOString(),
});

export const mapLogToRow = (entry: ModerationLogEntry): Record<string, any> => ({
  id: isValidUUID(entry.id) ? entry.id : generateUUID(),
  listing_id: entry.listingId,
  listing_title: entry.listingTitle,
  action: entry.action,
  previous_status: entry.previousStatus,
  new_status: entry.newStatus,
  moderator_id: isValidUUID(entry.moderatorId) ? entry.moderatorId : null,
  moderator_name: entry.moderatorName,
  reason: entry.reason || null,
  timestamp: entry.timestamp || new Date().toISOString(),
  created_at: entry.timestamp || new Date().toISOString(),
});

export const mapDisputeFromRow = (row: any): DisputeTicket => ({
  id: String(row.id),
  bookingId: row.booking_id || '',
  roomTitle: row.room_title || 'Room',
  complainantName: row.complainant_name || 'Complainant',
  complainantRole: (row.complainant_role as 'renter' | 'owner') || 'renter',
  issueType: row.issue_type || 'other',
  subject: row.subject || '',
  description: row.description || '',
  status: row.status || 'open',
  resolutionNotes: row.resolution_notes || undefined,
  createdAt: row.created_at || new Date().toISOString(),
});

/* =========================================================================
   Profiles Table Operations
   ========================================================================= */

export const getProfileFromSupabase = async (id: string | null | undefined): Promise<UserProfile | null> => {
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
      console.warn('Supabase getProfile notice:', error.message);
      return null;
    }
    return data ? mapProfileFromRow(data) : null;
  } catch (err: any) {
    console.warn('Supabase getProfile exception:', err?.message);
    return null;
  }
};

export const getProfileByEmailFromSupabase = async (email: string | null | undefined): Promise<UserProfile | null> => {
  if (!email || typeof email !== 'string') return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('email', email.trim())
      .maybeSingle();

    if (error) {
      console.warn('Supabase getProfileByEmail notice:', error.message);
      return null;
    }
    return data ? mapProfileFromRow(data) : null;
  } catch (err: any) {
    console.warn('Supabase getProfileByEmail exception:', err?.message);
    return null;
  }
};

export const saveProfileToSupabase = async (profile: UserProfile): Promise<void> => {
  if (!isValidUUID(profile.id)) {
    return;
  }

  try {
    const authUser = await getAuthenticatedSessionUser();
    if (!authUser || authUser.id !== profile.id) {
      return;
    }

    const row = mapProfileToRow(profile);
    const { error } = await supabase.from('profiles').upsert(row as any, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase saveProfile notice:', error.message);
    }
  } catch (err: any) {
    console.warn('Supabase saveProfile exception:', err?.message);
  }
};

export const subscribeToProfileInSupabase = (
  id: string | null | undefined,
  onUpdate: (profile: UserProfile) => void
): (() => void) => {
  if (!isValidUUID(id)) {
    return () => {};
  }

  try {
    const channelName = `profile-rt-${id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${id}`,
        },
        payload => {
          if (payload.new) {
            onUpdate(mapProfileFromRow(payload.new));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Supabase realtime profile subscription notice:', err);
    return () => {};
  }
};

/* =========================================================================
   Rooms Table Operations
   ========================================================================= */

export const fetchRoomsFromSupabase = async (): Promise<RoomListing[]> => {
  let remoteList: RoomListing[] = [];
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      remoteList = data.map(mapRoomFromRow);
    }
  } catch (err: any) {
    // Graceful offline fallback
  }

  // If remote rooms are successfully fetched from Supabase, they are the primary source of truth
  if (remoteList.length > 0) {
    // Keep local persistent store clean and in sync with authoritative remote rooms
    syncAllRoomsLocally(remoteList).catch(() => {});
    return remoteList;
  }

  // Fallback to locally published rooms from IndexedDB / LocalStorage only when offline
  let localList: RoomListing[] = [];
  try {
    localList = await getLocalStoredRooms();
  } catch (e) {}

  return localList;
};

export const saveRoomToSupabase = async (room: RoomListing): Promise<boolean> => {
  try {
    // 1. Persist to reliable local storage (IndexedDB + LocalStorage) immediately
    await persistRoomLocally(room);

    let ownerId = isValidUUID(room.owner?.id) ? room.owner.id : null;
    if (!ownerId) {
      const authUser = await getAuthenticatedSessionUser();
      if (authUser?.id && isValidUUID(authUser.id)) {
        ownerId = authUser.id;
      }
    }

    const row = mapRoomToRow(room);
    if (ownerId) {
      row.owner_id = ownerId;
      if (row.owner) {
        row.owner.id = ownerId;
      }
    }

    // 2. Save to remote Supabase Postgres database if available
    const { error } = await supabase.from('rooms').upsert(row as any, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase saveRoom notice:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('Supabase saveRoom exception:', err?.message);
    return false;
  }
};

export const updateRoomStatusInSupabase = async (
  roomId: string,
  newStatus: ListingStatus,
  extraFields: Record<string, any> = {}
): Promise<void> => {
  // Update local persistent copy
  try {
    const localRooms = await getLocalStoredRooms();
    const target = localRooms.find(r => r.id === roomId);
    if (target) {
      const updatedRoom: RoomListing = {
        ...target,
        status: newStatus,
        rejectionReason: extraFields.rejectionReason ?? target.rejectionReason,
        moderatedAt: extraFields.moderatedAt ?? target.moderatedAt,
        moderatedBy: extraFields.moderatedBy ?? target.moderatedBy,
      };
      await persistRoomLocally(updatedRoom);
    }
  } catch (e) {}

  if (!isValidUUID(roomId)) return;

  try {
    const updates: Record<string, any> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (extraFields.rejectionReason !== undefined) {
      updates.rejection_reason = extraFields.rejectionReason;
    }
    if (extraFields.moderatedAt !== undefined) {
      updates.moderated_at = extraFields.moderatedAt;
    }
    if (isValidUUID(extraFields.moderatedBy)) {
      updates.moderated_by = extraFields.moderatedBy;
    }

    const { error } = await (supabase.from('rooms') as any).update(updates).eq('id', roomId);
    if (error) {
      console.warn('Supabase updateRoomStatus notice:', error.message);
    }
  } catch (err: any) {
    console.warn('Supabase updateRoomStatus exception:', err?.message);
  }
};

export const deleteRoomFromSupabase = async (roomId: string): Promise<void> => {
  // Permanently remove from local storage (IndexedDB + LocalStorage)
  try {
    await removeRoomLocally(roomId);
  } catch (e) {}

  if (!isValidUUID(roomId)) return;

  try {
    const { error } = await supabase.from('rooms').delete().eq('id', roomId);
    if (error) {
      console.warn('Supabase deleteRoom notice:', error.message);
    }
  } catch (err: any) {
    console.warn('Supabase deleteRoom exception:', err?.message);
  }
};

/* =========================================================================
   Bookings Table Operations
   ========================================================================= */

export const saveBookingToSupabase = async (booking: BookingRequest): Promise<void> => {
  try {
    const row = mapBookingToRow(booking);
    const { error } = await supabase.from('bookings').upsert(row as any, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase saveBooking notice:', error.message);
    }
  } catch (err: any) {
    console.warn('Supabase saveBooking exception:', err?.message);
  }
};

export const fetchBookingsFromSupabase = async (
  userId?: string,
  role?: UserRole
): Promise<BookingRequest[]> => {
  try {
    const authUser = await getAuthenticatedSessionUser();
    if (!authUser) {
      return [];
    }

    if (userId !== undefined && !isValidUUID(userId)) {
      return [];
    }

    let query = supabase.from('bookings').select('*').order('created_at', { ascending: false });

    const targetUserId = (userId && isValidUUID(userId)) ? userId : authUser.id;
    if (role === 'owner') {
      query = query.eq('owner_id', targetUserId);
    } else if (role === 'renter') {
      query = query.or(`tenant_id.eq.${targetUserId},renter_id.eq.${targetUserId}`);
    } else if (userId) {
      query = query.or(`owner_id.eq.${userId},tenant_id.eq.${userId},renter_id.eq.${userId}`);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Supabase fetchBookings notice:', error.message);
      return [];
    }

    if (Array.isArray(data)) {
      return data.map(mapBookingFromRow);
    }
  } catch (err: any) {
    console.warn('Supabase fetchBookings exception:', err?.message);
  }
  return [];
};

export const updateBookingStatusInSupabase = async (
  bookingId: string,
  status: string
): Promise<void> => {
  if (!isValidUUID(bookingId)) return;
  const authUser = await getAuthenticatedSessionUser();
  if (!authUser) return;

  try {
    const { error } = await (supabase
      .from('bookings') as any)
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', bookingId);

    if (error) {
      console.warn('Supabase updateBookingStatus notice:', error.message);
    }
  } catch (err: any) {
    console.warn('Supabase updateBookingStatus exception:', err?.message);
  }
};

/* =========================================================================
   Moderation Logs Table Operations
   ========================================================================= */

export const recordModerationLogInSupabase = async (
  entry: Omit<ModerationLogEntry, 'id' | 'timestamp'>
): Promise<ModerationLogEntry> => {
  const fullEntry: ModerationLogEntry = {
    ...entry,
    id: generateUUID(),
    moderatorId: isValidUUID(entry.moderatorId) ? entry.moderatorId : undefined,
    timestamp: new Date().toISOString(),
  };

  try {
    const row = mapLogToRow(fullEntry);
    const { error } = await supabase.from('moderation_logs').insert(row as any);
    if (error) {
      console.warn('Supabase recordModerationLog notice:', error.message);
    }
  } catch (err: any) {
    console.warn('Supabase recordModerationLog exception:', err?.message);
  }

  return fullEntry;
};

export const fetchModerationLogsFromSupabase = async (): Promise<ModerationLogEntry[]> => {
  try {
    const authUser = await getAuthenticatedSessionUser();
    if (!authUser) return [];

    const { data, error } = await supabase
      .from('moderation_logs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      console.warn('Supabase fetchModerationLogs notice:', error.message);
      return [];
    }

    if (Array.isArray(data)) {
      return data.map(mapLogFromRow);
    }
  } catch (err: any) {
    console.warn('Supabase fetchModerationLogs exception:', err?.message);
  }
  return [];
};

/* =========================================================================
   Disputes Table Operations
   ========================================================================= */

export const fetchDisputesFromSupabase = async (): Promise<DisputeTicket[]> => {
  try {
    const authUser = await getAuthenticatedSessionUser();
    if (!authUser) return [];

    const { data, error } = await supabase
      .from('disputes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetchDisputes notice:', error.message);
      return [];
    }

    if (Array.isArray(data)) {
      return data.map(mapDisputeFromRow);
    }
  } catch (err: any) {
    console.warn('Supabase fetchDisputes exception:', err?.message);
  }
  return [];
};

export const createDisputeInSupabase = async (
  ticket: Omit<DisputeTicket, 'id' | 'createdAt'>
): Promise<DisputeTicket | null> => {
  const authUser = await getAuthenticatedSessionUser();
  if (!authUser) return null;

  const id = generateUUID();
  const createdAt = new Date().toISOString();
  const row = {
    id,
    booking_id: isValidUUID(ticket.bookingId) ? ticket.bookingId : null,
    room_title: ticket.roomTitle,
    complainant_name: ticket.complainantName,
    complainant_role: ticket.complainantRole,
    issue_type: ticket.issueType,
    subject: ticket.subject,
    description: ticket.description,
    status: ticket.status || 'open',
    resolution_notes: ticket.resolutionNotes || null,
    created_at: createdAt,
    updated_at: createdAt,
  };

  try {
    const { error } = await supabase.from('disputes').insert(row as any);
    if (error) {
      console.warn('Supabase createDispute error:', error.message);
      return null;
    }
    return { ...ticket, id, createdAt };
  } catch (err) {
    console.warn('Supabase createDispute exception:', err);
    return null;
  }
};

export const updateDisputeStatusInSupabase = async (
  disputeId: string,
  status: string,
  resolutionNotes?: string
): Promise<boolean> => {
  if (!isValidUUID(disputeId)) return false;
  const authUser = await getAuthenticatedSessionUser();
  if (!authUser) return false;

  try {
    const { error } = await (supabase
      .from('disputes') as any)
      .update({
        status,
        resolution_notes: resolutionNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', disputeId);
    return !error;
  } catch (err) {
    return false;
  }
};

/* =========================================================================
   Analytics Events Helper
   ========================================================================= */

export const trackAnalyticsEvent = async (
  eventType: string,
  sessionId: string,
  userId?: string | null,
  roomId?: string | null,
  metadata: Record<string, any> = {}
): Promise<void> => {
  try {
    const safeUserId = isValidUUID(userId) ? userId : null;
    const safeRoomId = isValidUUID(roomId) ? roomId : null;

    // Never log sensitive contents (passwords, auth secrets, raw document data)
    const sanitizedMetadata = { ...metadata };
    delete sanitizedMetadata.password;
    delete sanitizedMetadata.token;
    delete sanitizedMetadata.secret;

    if (eventType === 'room_view' && safeRoomId) {
      await (supabase.from('room_views') as any).insert({
        room_id: safeRoomId,
        viewer_id: safeUserId,
      });
    }
  } catch {
    // Non-blocking telemetry
  }
};

/* =========================================================================
   Direct Supabase Database Aliases
   ========================================================================= */
export const fetchRoomsFromFirestore = fetchRoomsFromSupabase;
export const saveRoomToFirestore = saveRoomToSupabase;
export const updateRoomStatusInFirestore = updateRoomStatusInSupabase;
export const deleteRoomFromFirestore = deleteRoomFromSupabase;
export const recordModerationLog = recordModerationLogInSupabase;
export const fetchModerationLogs = fetchModerationLogsFromSupabase;


