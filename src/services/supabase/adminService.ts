import { supabase, isValidUUID, getAuthenticatedSessionUser } from '../../lib/supabase';
import { UserProfile, RoomListing, ModerationLogEntry, ListingStatus } from '../../types';
import { mapProfileRowToModel } from './profileService';
import { mapRoomRowToModel } from './roomService';

/**
 * Fetch all user profiles for Admin panel
 */
export const getAllProfiles = async (): Promise<UserProfile[]> => {
  try {
    const authUser = await getAuthenticatedSessionUser();
    if (!authUser) return [];

    const { data, error } = await (supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false }) as any);

    if (error || !data) return [];
    return data.map(mapProfileRowToModel);
  } catch (err) {
    console.warn('Exception in getAllProfiles:', err);
    return [];
  }
};

/**
 * Verify a user's account / citizenship
 */
export const verifyUserProfile = async (
  userId: string,
  isVerified: boolean,
  citizenshipVerified: boolean = false
): Promise<boolean> => {
  if (!isValidUUID(userId)) return false;

  const authUser = await getAuthenticatedSessionUser();
  if (!authUser) return false;

  try {
    const { error } = await (supabase
      .from('profiles') as any)
      .update({
        is_verified: isVerified,
        citizenship_verified: citizenshipVerified,
      })
      .eq('id', userId);

    return !error;
  } catch (err) {
    return false;
  }
};

/**
 * Update user role (e.g. promote to owner or admin)
 */
export const updateUserRole = async (
  userId: string,
  newRole: 'renter' | 'owner' | 'admin'
): Promise<boolean> => {
  if (!isValidUUID(userId)) return false;

  const authUser = await getAuthenticatedSessionUser();
  if (!authUser) return false;

  try {
    const { error } = await (supabase
      .from('profiles') as any)
      .update({ role: newRole })
      .eq('id', userId);

    return !error;
  } catch (err) {
    return false;
  }
};

/**
 * Fetch all room listings for admin moderation (pending, approved, etc.)
 */
export const getAllRoomsForAdmin = async (): Promise<RoomListing[]> => {
  try {
    const authUser = await getAuthenticatedSessionUser();
    if (!authUser) return [];

    const { data, error } = await (supabase
      .from('rooms')
      .select('*')
      .order('created_at', { ascending: false }) as any);

    if (error || !data) return [];

    return data.map((row: any) => mapRoomRowToModel(row, row.images || []));
  } catch (err) {
    console.warn('Exception in getAllRoomsForAdmin:', err);
    return [];
  }
};

/**
 * Moderate a room listing (approve, reject, suspend)
 */
export const moderateRoomListing = async (
  roomId: string,
  newStatus: ListingStatus,
  moderatorId: string,
  moderatorName: string,
  reason?: string
): Promise<boolean> => {
  if (!isValidUUID(roomId)) return false;

  const authUser = await getAuthenticatedSessionUser();
  if (!authUser) return false;

  try {
    // 1. Update room status
    const { error: roomError } = await (supabase
      .from('rooms') as any)
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roomId);

    if (roomError) return false;

    // 2. Fetch room details to record log
    const { data: roomData } = await (supabase
      .from('rooms')
      .select('title, owner_id')
      .eq('id', roomId)
      .single() as any);

    // 3. Notify owner
    if (roomData?.owner_id && isValidUUID(roomData.owner_id)) {
      await (supabase.from('notifications').insert({
        user_id: roomData.owner_id,
        title: newStatus === 'approved' ? 'Listing Approved!' : 'Listing Moderated',
        message:
          newStatus === 'approved'
            ? `Your listing "${roomData.title}" is now published and verified.`
            : `Your listing "${roomData.title}" status changed to ${newStatus}. ${reason || ''}`,
        type: newStatus === 'approved' ? 'room_approved' : 'room_rejected',
        reference_id: roomId,
      } as any) as any);
    }

    return true;
  } catch (err) {
    console.warn('Exception in moderateRoomListing:', err);
    return false;
  }
};

/**
 * Fetch platform overview statistics
 */
export const getPlatformStats = async (): Promise<{
  totalUsers: number;
  totalRooms: number;
  approvedRooms: number;
  pendingRooms: number;
  totalBookings: number;
}> => {
  try {
    const authUser = await getAuthenticatedSessionUser();
    if (!authUser) {
      return { totalUsers: 0, totalRooms: 0, approvedRooms: 0, pendingRooms: 0, totalBookings: 0 };
    }

    const [usersRes, roomsRes, bookingsRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('rooms').select('id, status'),
      supabase.from('bookings').select('id', { count: 'exact', head: true }),
    ]);

    const totalUsers = usersRes.count || 0;
    const totalBookings = bookingsRes.count || 0;
    const rooms = (roomsRes.data || []) as any[];
    const totalRooms = rooms.length;
    const approvedRooms = rooms.filter(r => r.status === 'approved').length;
    const pendingRooms = rooms.filter(r => r.status === 'pending').length;

    return { totalUsers, totalRooms, approvedRooms, pendingRooms, totalBookings };
  } catch (err) {
    return { totalUsers: 0, totalRooms: 0, approvedRooms: 0, pendingRooms: 0, totalBookings: 0 };
  }
};
