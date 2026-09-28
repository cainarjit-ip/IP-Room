import { supabase, isValidUUID, getAuthenticatedSessionUser } from '../../lib/supabase';
import { AppNotification } from '../fcmService';

export const mapNotificationRowToModel = (row: any): AppNotification => ({
  id: row.id,
  toUserId: row.user_id || '',
  toRole: 'all',
  title: row.title,
  body: row.message,
  type:
    row.type === 'booking_request' || row.type === 'booking_inquiry'
      ? 'booking_inquiry'
      : row.type === 'booking_accepted' || row.type === 'booking_confirmed' || row.type === 'booking_approved'
        ? 'booking_confirmed'
        : 'system',
  createdAt: row.created_at || new Date().toISOString(),
  read: Boolean(row.is_read),
  data: {
    bookingId: row.reference_id || undefined,
  },
});

/**
 * Fetch notifications for a user
 */
export const getUserNotifications = async (userId: string): Promise<AppNotification[]> => {
  if (!isValidUUID(userId)) return [];

  const authUser = await getAuthenticatedSessionUser();
  if (!authUser || authUser.id !== userId) return [];

  try {
    const { data, error } = await (supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30) as any);

    if (error || !data) return [];

    return data.map(mapNotificationRowToModel);
  } catch (err) {
    console.warn('Exception in getUserNotifications:', err);
    return [];
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  if (!isValidUUID(notificationId)) return false;

  const authUser = await getAuthenticatedSessionUser();
  if (!authUser) return false;

  try {
    const { error } = await (supabase
      .from('notifications') as any)
      .update({ is_read: true })
      .eq('id', notificationId);

    return !error;
  } catch (err) {
    return false;
  }
};

/**
 * Create notification
 */
export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: string,
  referenceId?: string
): Promise<boolean> => {
  if (!isValidUUID(userId)) return false;

  try {
    const { error } = await (supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        reference_id: (referenceId && isValidUUID(referenceId)) ? referenceId : null,
        is_read: false,
      } as any) as any);

    return !error;
  } catch (err) {
    return false;
  }
};

/**
 * Realtime subscription to user notifications
 */
export const subscribeToNotifications = (
  userId: string,
  onNotification: (notification: AppNotification) => void
): (() => void) => {
  if (!isValidUUID(userId)) return () => {};

  const channel = supabase
    .channel(`notifications-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new) {
          onNotification(mapNotificationRowToModel(payload.new));
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
