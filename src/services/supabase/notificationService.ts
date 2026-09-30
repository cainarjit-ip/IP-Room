import { supabase, isValidUUID, getAuthenticatedSessionUser } from '../../lib/supabase';
import { UserRole, BookingRequest, UserProfile } from '../../types';

export type NotificationType =
  | 'booking_inquiry'
  | 'booking_confirmed'
  | 'chat_message'
  | 'system';

export interface AppNotification {
  id: string;
  toUserId: string;
  toRole: UserRole | 'all';
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  data?: {
    bookingId?: string;
    roomId?: string;
    senderId?: string;
    senderName?: string;
    amount?: number;
    url?: string;
  };
  createdAt: string;
}

// In-app broadcast listeners
type NotificationListener = (notification: AppNotification) => void;
const inAppListeners: Set<NotificationListener> = new Set();

export const addNotificationListener = (listener: NotificationListener) => {
  inAppListeners.add(listener);
  return () => {
    inAppListeners.delete(listener);
  };
};

const notifyInAppListeners = (notification: AppNotification) => {
  inAppListeners.forEach(listener => {
    try {
      listener(notification);
    } catch (e) {
      console.warn('Notification listener error:', e);
    }
  });
};

/**
 * Request Browser Push Notification Permission
 */
export const requestPushNotificationPermission = async (
  currentUser: UserProfile | null
): Promise<{ status: NotificationPermission; token: string | null }> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { status: 'denied', token: null };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { status: permission, token: null };
    }

    const token = `supabase-web-${currentUser?.id || 'guest'}-${Date.now()}`;
    return { status: permission, token };
  } catch (err) {
    console.warn('Notification permission error:', err);
    return { status: 'denied', token: null };
  }
};

/**
 * Register foreground notification listener for in-app alert banners
 */
export const setupForegroundFCMListener = async (
  onNotificationReceived: (notification: AppNotification) => void
): Promise<(() => void) | null> => {
  const unsubscribe = addNotificationListener(onNotificationReceived);
  return unsubscribe;
};

export const setupForegroundNotificationListener = setupForegroundFCMListener;

/**
 * Send real-time notification via Supabase PostgreSQL
 */
export const sendPushNotification = async (
  notification: Omit<AppNotification, 'id' | 'createdAt'>
): Promise<AppNotification> => {
  const createdId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `notif-${Date.now()}`;
  const now = new Date().toISOString();

  const appNotif: AppNotification = {
    ...notification,
    id: createdId,
    createdAt: now,
  };

  // Broadcast to all active in-app listeners
  notifyInAppListeners(appNotif);

  // Show native browser desktop notification if permission granted
  if (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'granted'
  ) {
    try {
      new Notification(appNotif.title, {
        body: appNotif.body,
        icon: '/vite.svg',
      });
    } catch (e) {
      console.warn('Native notification notice:', e);
    }
  }

  // Persist into Supabase notifications table if valid UUID
  if (isValidUUID(notification.toUserId)) {
    try {
      await (supabase.from('notifications') as any).insert({
        id: isValidUUID(createdId) ? createdId : undefined,
        user_id: notification.toUserId,
        title: notification.title,
        message: notification.body,
        type: notification.type,
        reference_id: (notification.data?.bookingId && isValidUUID(notification.data.bookingId)) ? notification.data.bookingId : null,
        is_read: false,
        created_at: now,
      });
    } catch (err) {
      console.warn('Supabase notification insert notice:', err);
    }
  }

  return appNotif;
};

/**
 * Send real-time notification to owner when student creates a booking inquiry
 */
export const notifyOwnerOfNewBookingInquiry = async (
  arg1: any,
  arg2?: any
): Promise<AppNotification> => {
  let booking: BookingRequest;
  let tenantName = 'Student';

  if (typeof arg1 === 'string') {
    booking = arg2 as BookingRequest;
  } else {
    booking = arg1 as BookingRequest;
    tenantName = arg2 || 'Student';
  }

  const ownerId = booking?.ownerId || (typeof arg1 === 'string' ? arg1 : 'all');
  const roomTitle = booking?.roomTitle || 'Room Listing';
  const totalPaid = booking?.totalPaid || 0;

  return sendPushNotification({
    toUserId: ownerId,
    toRole: 'owner',
    type: 'booking_inquiry',
    title: 'New Room Booking Request! 🏠',
    body: `${tenantName} requested to book "${roomTitle}" for NPR ${totalPaid.toLocaleString()}. Review in Owner Dashboard.`,
    read: false,
    data: {
      bookingId: booking?.id,
      roomId: booking?.roomId,
      senderId: booking?.tenantId,
      senderName: tenantName,
      amount: totalPaid,
    },
  });
};

/**
 * Send real-time notification to student when owner approves/confirms booking
 */
export const notifyStudentOfBookingConfirmed = async (
  arg1: any,
  arg2?: any,
  arg3?: string
): Promise<AppNotification> => {
  let booking: BookingRequest;
  let ownerName = 'Landlord';

  if (typeof arg1 === 'string') {
    booking = arg2 as BookingRequest;
    ownerName = arg3 || 'Landlord';
  } else {
    booking = arg1 as BookingRequest;
    ownerName = arg2 || 'Landlord';
  }

  const tenantId = booking?.tenantId || (typeof arg1 === 'string' ? arg1 : 'all');
  const roomTitle = booking?.roomTitle || 'Room Listing';
  const totalPaid = booking?.totalPaid || 0;

  return sendPushNotification({
    toUserId: tenantId,
    toRole: 'renter',
    type: 'booking_confirmed',
    title: 'Booking Request Confirmed! 🎉',
    body: `Landlord ${ownerName} has approved your booking for "${roomTitle}". Your digital tenancy lease agreement is ready!`,
    read: false,
    data: {
      bookingId: booking?.id,
      roomId: booking?.roomId,
      senderId: booking?.ownerId,
      senderName: ownerName,
      amount: totalPaid,
    },
  });
};

/**
 * Send real-time notification when owner or student sends a chat message
 */
export const notifyChatMessage = async (
  recipientId: string,
  recipientRole: 'renter' | 'owner',
  senderName: string,
  messageText: string,
  roomTitle: string,
  roomId?: string
): Promise<AppNotification> => {
  const shortMsg = messageText.length > 70 ? messageText.substring(0, 67) + '...' : messageText;
  return sendPushNotification({
    toUserId: recipientId,
    toRole: recipientRole,
    type: 'chat_message',
    title: `New Message from ${senderName} 💬`,
    body: `"${shortMsg}" — regarding ${roomTitle}`,
    read: false,
    data: {
      roomId,
      senderName,
    },
  });
};

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
 * Realtime subscription to user notifications from Supabase
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

/**
 * Subscribe to real-time notifications from Supabase for the current user
 */
export const subscribeToRealtimeNotifications = (
  userRole: UserRole,
  userId: string | undefined,
  onUpdate: (notifications: AppNotification[]) => void
): (() => void) => {
  if (!userId || !isValidUUID(userId)) {
    return () => {};
  }

  // Initial load from Supabase
  supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(25)
    .then(({ data, error }) => {
      if (!error && data) {
        const notifs: AppNotification[] = data.map((row: any) => ({
          id: row.id,
          toUserId: row.user_id,
          toRole: userRole,
          type: (row.type as NotificationType) || 'system',
          title: row.title || 'IP Room Notification',
          body: row.message || '',
          read: Boolean(row.is_read),
          createdAt: row.created_at || new Date().toISOString(),
          data: row.reference_id ? { bookingId: row.reference_id } : undefined,
        }));
        onUpdate(notifs);
      }
    });

  // Realtime subscription via Supabase Channel
  const channel = supabase
    .channel(`notifs-live-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      () => {
        // Refresh notifications from Supabase
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(25)
          .then(({ data }) => {
            if (data) {
              const refreshed: AppNotification[] = data.map((row: any) => ({
                id: row.id,
                toUserId: row.user_id,
                toRole: userRole,
                type: (row.type as NotificationType) || 'system',
                title: row.title || 'IP Room Notification',
                body: row.message || '',
                read: Boolean(row.is_read),
                createdAt: row.created_at || new Date().toISOString(),
                data: row.reference_id ? { bookingId: row.reference_id } : undefined,
              }));
              onUpdate(refreshed);
            }
          });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
