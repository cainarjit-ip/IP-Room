import { supabase, isValidUUID, getAuthenticatedSessionUser } from '../../lib/supabase';
import { PaymentStatus } from '../../types/database';

export interface PaymentRecord {
  id?: string;
  bookingId?: string;
  payerId: string;
  receiverId: string;
  amount: number;
  currency?: string;
  paymentMethod: 'esewa' | 'khalti' | 'connectips' | 'fonepay' | 'bank_transfer' | string;
  provider: string;
  transactionId?: string;
  status: PaymentStatus;
  paidAt?: string;
}

/**
 * Record a payment in Supabase payments table
 */
export const recordPayment = async (
  record: PaymentRecord
): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    const authUser = await getAuthenticatedSessionUser();
    const safeBookingId = (record.bookingId && isValidUUID(record.bookingId)) ? record.bookingId : null;
    const safePayerId = (record.payerId && isValidUUID(record.payerId)) ? record.payerId : (authUser?.id || null);
    const safeReceiverId = (record.receiverId && isValidUUID(record.receiverId)) ? record.receiverId : null;

    const payload = {
      booking_id: safeBookingId,
      payer_id: safePayerId,
      receiver_id: safeReceiverId,
      amount: record.amount,
      currency: record.currency || 'NPR',
      payment_method: record.paymentMethod,
      provider: record.provider,
      transaction_id: record.transactionId || `TXN-${Date.now()}`,
      status: record.status,
      paid_at: record.paidAt || new Date().toISOString(),
    };

    const { data, error } = await (supabase
      .from('payments')
      .insert(payload as any)
      .select('id')
      .single() as any);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to record payment' };
  }
};

/**
 * Fetch payments for a user (as payer or receiver)
 */
export const getUserPayments = async (userId: string): Promise<any[]> => {
  if (!isValidUUID(userId)) {
    return [];
  }

  const authUser = await getAuthenticatedSessionUser();
  if (!authUser || authUser.id !== userId) {
    return [];
  }

  try {
    const { data, error } = await (supabase
      .from('payments')
      .select('*, bookings(room_listings(title))')
      .or(`payer_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false }) as any);

    if (error) {
      console.warn('Error fetching payments from Supabase:', error.message);
      return [];
    }

    return data || [];
  } catch (err: any) {
    console.warn('Exception in getUserPayments:', err?.message);
    return [];
  }
};
