import { supabase, isValidUUID, getAuthenticatedSessionUser } from '../../lib/supabase';
import { BookingRequest } from '../../types';

export const mapBookingRowToModel = (row: any): BookingRequest => ({
  id: row.id,
  roomId: row.room_id,
  roomTitle: row.room_listings?.title || row.room_title || 'Room in Nepal',
  roomAddress: row.room_listings?.address || row.room_address || 'Nepal',
  roomPrice: Number(row.monthly_rent || 0),
  roomImage:
    row.room_listings?.room_images?.[0]?.image_url ||
    row.room_image ||
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
  tenantId: row.renter_id,
  tenantName: row.renter?.full_name || row.tenant_name || 'Student / Renter',
  tenantPhone: row.renter?.phone || row.tenant_phone || '+977 98XXXXXXXX',
  tenantEmail: row.renter?.email || row.tenant_email || '',
  ownerId: row.owner_id,
  moveInDate: row.move_in_date,
  durationMonths: row.duration_months || 1,
  totalMonthlyRent: Number(row.monthly_rent || 0),
  securityDeposit: Number(row.security_deposit || 0),
  totalPaid: Number(row.monthly_rent || 0) + Number(row.security_deposit || 0),
  paymentMethod: 'khalti',
  paymentRefId: '',
  status:
    row.status === 'accepted'
      ? 'confirmed'
      : row.status === 'rejected'
        ? 'cancelled'
        : 'pending_approval',
  contractGenerated: row.status === 'accepted',
  createdAt: row.created_at,
});

/**
 * Fetch bookings for a specific user (as tenant or owner)
 */
export const getUserBookings = async (
  userId: string,
  role: 'renter' | 'owner'
): Promise<BookingRequest[]> => {
  if (!isValidUUID(userId)) {
    return [];
  }

  const authUser = await getAuthenticatedSessionUser();
  if (!authUser) {
    return [];
  }

  try {
    const column = role === 'owner' ? 'owner_id' : 'renter_id';

    const { data, error } = await (supabase
      .from('bookings')
      .select('*')
      .eq(column, userId)
      .order('created_at', { ascending: false }) as any);

    if (error) {
      console.warn('Error fetching bookings from Supabase:', error.message);
      return [];
    }

    return (data || []).map(mapBookingRowToModel);
  } catch (err: any) {
    console.warn('Exception in getUserBookings:', err?.message);
    return [];
  }
};

/**
 * Create a new booking request in Supabase
 */
export const createBooking = async (
  booking: BookingRequest
): Promise<{ booking: BookingRequest | null; error: string | null }> => {
  try {
    const safeId = isValidUUID(booking.id) ? booking.id : undefined;
    const safeRoomId = isValidUUID(booking.roomId) ? booking.roomId : null;
    const safeRenterId = isValidUUID(booking.tenantId) ? booking.tenantId : null;
    const safeOwnerId = isValidUUID(booking.ownerId) ? booking.ownerId : null;

    const payload = {
      ...(safeId ? { id: safeId } : {}),
      room_id: safeRoomId,
      renter_id: safeRenterId,
      owner_id: safeOwnerId,
      move_in_date: booking.moveInDate,
      duration_months: booking.durationMonths || 1,
      message: `Booking request from ${booking.tenantName}`,
      status: 'pending',
      monthly_rent: booking.totalMonthlyRent || booking.roomPrice,
      security_deposit: booking.securityDeposit || 0,
    };

    const { data, error } = await (supabase
      .from('bookings')
      .insert(payload as any)
      .select()
      .single() as any);

    if (error) {
      return { booking: null, error: error.message };
    }

    return { booking: mapBookingRowToModel(data), error: null };
  } catch (err: any) {
    return { booking: null, error: err?.message || 'Failed to submit booking.' };
  }
};

/**
 * Update booking status (accept, reject, cancel)
 */
export const updateBookingStatus = async (
  bookingId: string,
  newStatus: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed'
): Promise<boolean> => {
  if (!isValidUUID(bookingId)) return false;

  const authUser = await getAuthenticatedSessionUser();
  if (!authUser) return false;

  try {
    const { error } = await (supabase
      .from('bookings') as any)
      .update({ status: newStatus })
      .eq('id', bookingId);

    return !error;
  } catch (err: any) {
    console.warn('Error updating booking status:', err?.message);
    return false;
  }
};

/**
 * Realtime subscription to bookings
 */
export const subscribeToBookings = (
  userId: string,
  role: 'renter' | 'owner',
  callback: (booking: any) => void
): (() => void) => {
  if (!isValidUUID(userId)) return () => {};

  const column = role === 'owner' ? 'owner_id' : 'renter_id';

  const channelName = `bookings-${role}-${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: `${column}=eq.${userId}`,
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
