import { supabase, isValidUUID, getAuthenticatedSessionUser } from '../../lib/supabase';
import { UserRole, BookingRequest, UserProfile } from '../../types';

let _globalRealtimeChannel: any = null;
export const getGlobalRealtimeChannel = (): any => {
  if (!_globalRealtimeChannel) {
    _globalRealtimeChannel = supabase.channel('global_iproom_notifications');
    _globalRealtimeChannel.subscribe();
  }
  return _globalRealtimeChannel;
};

export const CURRENT_CLIENT_SESSION_ID: string =
  typeof window !== 'undefined'
    ? (window as any).__IPROOM_CLIENT_SESSION_ID__ ||
      ((window as any).__IPROOM_CLIENT_SESSION_ID__ = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`)
    : 'sess_server';

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
  senderSessionId?: string;
  data?: {
    bookingId?: string;
    roomId?: string;
    conversationId?: string;
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

// Listen for cross-device notifications over Supabase Realtime WebSockets
if (typeof window !== 'undefined') {
  try {
    const globalChannel = getGlobalRealtimeChannel();
    globalChannel.on('broadcast', { event: 'new_notification' }, ({ payload }: { payload: any }) => {
      if (!payload || !payload.id) return;
      // CRITICAL: NEVER notify the sender from the same browser session or device!
      if (payload.senderSessionId && payload.senderSessionId === CURRENT_CLIENT_SESSION_ID) {
        return;
      }
      notifyInAppListeners(payload as AppNotification);

      // Trigger desktop notification only on the RECIPIENT's device
      if (
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        try {
          new Notification(payload.title, {
            body: payload.body,
            icon: '/vite.svg',
          });
        } catch (e) {
          // Ignore desktop notification error
        }
      }
    });
  } catch (e) {}
}

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
    senderSessionId: notification.senderSessionId || CURRENT_CLIENT_SESSION_ID,
    createdAt: now,
  };

  // Dispatch to local in-app listeners so the active tab updates the notification bell and displays toast
  notifyInAppListeners(appNotif);

  // Broadcast globally over Supabase Realtime WebSockets to remote clients/devices
  try {
    const globalChannel = getGlobalRealtimeChannel();
    globalChannel.send({
      type: 'broadcast',
      event: 'new_notification',
      payload: appNotif,
    }).catch(() => {});
  } catch (e) {}

  // Save to role-specific and user-specific local queue so recipient receives it when viewing their dashboard/role
  try {
    if (appNotif.toUserId) {
      const queueKey = `iproom_notifs_user_${appNotif.toUserId}`;
      const existing = JSON.parse(localStorage.getItem(queueKey) || '[]');
      const updated = [appNotif, ...existing.filter((n: any) => n.id !== appNotif.id)].slice(0, 30);
      localStorage.setItem(queueKey, JSON.stringify(updated));
    }
    if (appNotif.toRole) {
      const roleQueueKey = `iproom_notifs_role_${appNotif.toRole}`;
      const existingRole = JSON.parse(localStorage.getItem(roleQueueKey) || '[]');
      const updatedRole = [appNotif, ...existingRole.filter((n: any) => n.id !== appNotif.id)].slice(0, 30);
      localStorage.setItem(roleQueueKey, JSON.stringify(updatedRole));
    }
  } catch (e) {
    // ignore local storage error
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
        reference_id: notification.data?.roomId || notification.data?.bookingId || null,
        data: notification.data || {},
        is_read: false,
        read: false,
        created_at: now,
      });
    } catch (err) {
      // Non-fatal if RLS restricts anon inserts
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
  roomId?: string,
  senderId?: string,
  conversationId?: string
): Promise<AppNotification> => {
  const shortMsg = messageText.length > 70 ? messageText.substring(0, 67) + '...' : messageText;
  return sendPushNotification({
    toUserId: recipientId,
    toRole: recipientRole,
    type: 'chat_message',
    title: `New Message from ${senderName} 💬`,
    body: `"${shortMsg}" — ${roomTitle}`,
    read: false,
    data: {
      roomId,
      conversationId,
      senderId,
      senderName,
    },
  });
};

export const mapNotificationRowToModel = (row: any): AppNotification => {
  let parsedData: any = {};
  if (typeof row.data === 'string') {
    try {
      parsedData = JSON.parse(row.data);
    } catch (e) {
      parsedData = {};
    }
  } else if (row.data && typeof row.data === 'object') {
    parsedData = row.data;
  }

  const roomId =
    parsedData.roomId ||
    parsedData.room_id ||
    (row.type === 'chat_message' ? row.reference_id : undefined);

  const conversationId =
    parsedData.conversationId ||
    parsedData.conversation_id ||
    undefined;

  return {
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
          : row.type === 'chat_message'
            ? 'chat_message'
            : 'system',
    createdAt: row.created_at || row.timestamp || new Date().toISOString(),
    read: Boolean(row.is_read || row.read),
    data: {
      bookingId: row.type?.startsWith('booking') ? (row.reference_id || parsedData.bookingId) : undefined,
      roomId: roomId,
      conversationId: conversationId,
      senderId: parsedData.senderId || parsedData.sender_id || undefined,
      senderName: parsedData.senderName || parsedData.sender_name || undefined,
    },
  };
};

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
  // Always update local storage queues so client state persists
  if (typeof window !== 'undefined') {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('iproom_notifs_')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              const updated = list.map((item: any) =>
                item.id === notificationId ? { ...item, read: true, is_read: true } : item
              );
              localStorage.setItem(key, JSON.stringify(updated));
            }
          }
        }
      }
    } catch (e) {}
  }

  if (!isValidUUID(notificationId)) return true;

  const authUser = await getAuthenticatedSessionUser();
  if (!authUser) return true;

  try {
    const { error } = await (supabase
      .from('notifications') as any)
      .update({ is_read: true, read: true })
      .eq('id', notificationId);

    return !error;
  } catch (err) {
    return false;
  }
};

/**
 * Mark all notifications as read for current user
 */
export const markAllNotificationsAsRead = async (
  userId?: string,
  _role?: UserRole
): Promise<boolean> => {
  if (typeof window !== 'undefined') {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('iproom_notifs_')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              const updated = list.map((item: any) => ({
                ...item,
                read: true,
                is_read: true,
              }));
              localStorage.setItem(key, JSON.stringify(updated));
            }
          }
        }
      }
    } catch (e) {}
  }

  if (userId && isValidUUID(userId)) {
    try {
      await (supabase.from('notifications') as any)
        .update({ is_read: true, read: true })
        .eq('user_id', userId);
    } catch (e) {}
  }

  return true;
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

  const channelName = `notifs-${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const channel = supabase
    .channel(channelName)
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
        const notifs: AppNotification[] = data.map(mapNotificationRowToModel);
        onUpdate(notifs);
      }
    });

  // Realtime subscription via Supabase Channel
  const channelName = `notifs-live-${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const channel = supabase
    .channel(channelName)
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
              const refreshed: AppNotification[] = data.map(mapNotificationRowToModel);
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
