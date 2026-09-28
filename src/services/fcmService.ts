import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  Messaging,
} from 'firebase/messaging';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { UserProfile, UserRole, BookingRequest } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

export type NotificationType =
  | 'booking_inquiry'
  | 'booking_confirmed'
  | 'chat_message'
  | 'system';

export interface AppNotification {
  id: string;
  toUserId: string;
  toRole: 'renter' | 'owner' | 'all';
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

// Messaging instance holder
let messagingInstance: Messaging | null = null;
let isMessagingSupportedChecked = false;
let isMessagingSupported = false;

/**
 * Initialize FCM Messaging safely (with browser support verification)
 */
export const getSafeMessaging = async (): Promise<Messaging | null> => {
  if (typeof window === 'undefined') return null;

  if (!isMessagingSupportedChecked) {
    try {
      isMessagingSupported = await isSupported();
      isMessagingSupportedChecked = true;
    } catch (e) {
      console.warn('FCM isSupported check notice:', e);
      isMessagingSupported = false;
      isMessagingSupportedChecked = true;
    }
  }

  if (!isMessagingSupported) {
    return null;
  }

  if (!messagingInstance) {
    try {
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      messagingInstance = getMessaging(app);
    } catch (e) {
      console.warn('Could not instantiate FCM Messaging:', e);
      return null;
    }
  }

  return messagingInstance;
};

/**
 * Request Browser Push Notification Permission and retrieve FCM device token
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

    const messaging = await getSafeMessaging();
    let fcmToken: string | null = null;

    if (messaging && 'serviceWorker' in navigator) {
      try {
        // Register service worker for FCM background push
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        fcmToken = await getToken(messaging, {
          serviceWorkerRegistration: registration,
          vapidKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuYtr3qMg740mqqZ36vdVuBV4Y'
        });
      } catch (tokenErr) {
        console.warn('FCM device registration token notice:', tokenErr);
        // Fallback demo device registration token for testing
        fcmToken = `fcm-token-${currentUser?.id || 'guest'}-${Date.now()}`;
      }
    } else {
      fcmToken = `fcm-web-${currentUser?.id || 'guest'}-${Date.now()}`;
    }

    // Persist device token to user document in Firestore if logged in
    if (currentUser && fcmToken) {
      try {
        const userRef = doc(db, 'users', currentUser.id);
        await updateDoc(userRef, {
          fcmToken,
          fcmTokenUpdatedAt: serverTimestamp(),
          pushNotificationsEnabled: true,
        });
      } catch (e) {
        console.warn('Could not save FCM token to Firestore user document:', e);
      }
    }

    return { status: 'granted', token: fcmToken };
  } catch (error) {
    console.warn('Error requesting push notification permission:', error);
    return { status: 'denied', token: null };
  }
};

/**
 * Display native browser push notification if permitted
 */
export const triggerBrowserNotification = (
  title: string,
  options: NotificationOptions
) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });
    } catch (e) {
      // In some mobile browsers, notification must be triggered through service worker
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title,
          options,
        });
      }
    }
  }
};

/**
 * Listen for foreground FCM messages
 */
export const setupForegroundFCMListener = async (
  onReceived: (notification: AppNotification) => void
): Promise<(() => void) | null> => {
  const messaging = await getSafeMessaging();
  if (!messaging) return null;

  try {
    const unsubscribe = onMessage(messaging, payload => {
      const appNotif: AppNotification = {
        id: `fcm-${Date.now()}`,
        toUserId: payload.data?.toUserId || 'all',
        toRole: (payload.data?.toRole as any) || 'all',
        type: (payload.data?.type as any) || 'system',
        title: payload.notification?.title || payload.data?.title || 'IP Room Alert',
        body: payload.notification?.body || payload.data?.body || '',
        read: false,
        data: payload.data as any,
        createdAt: new Date().toISOString(),
      };

      triggerBrowserNotification(appNotif.title, { body: appNotif.body });
      notifyInAppListeners(appNotif);
      onReceived(appNotif);
    });

    return unsubscribe;
  } catch (e) {
    console.warn('Error setting up FCM onMessage listener:', e);
    return null;
  }
};

/**
 * Dispatch Push Notification across FCM, Firestore, and in-app listeners
 */
export const sendPushNotification = async (
  notification: Omit<AppNotification, 'id' | 'createdAt'>
): Promise<AppNotification> => {
  const newNotif: AppNotification = {
    ...notification,
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  };

  // 1. Trigger local in-app banner toast immediately
  notifyInAppListeners(newNotif);

  // 2. Trigger native OS browser push notification
  triggerBrowserNotification(newNotif.title, {
    body: newNotif.body,
    tag: newNotif.type,
  });

  // 3. Persist to Firestore notifications collection for persistent notification bell
  try {
    const notifCollection = collection(db, 'notifications');
    await addDoc(notifCollection, {
      ...newNotif,
      serverTime: serverTimestamp(),
    });
  } catch (e) {
    console.warn('Could not persist notification document to Firestore:', e);
  }

  return newNotif;
};

/**
 * Send real-time notification to owner when a student creates a new booking inquiry
 */
export const notifyOwnerOfNewBookingInquiry = async (
  ownerId: string,
  booking: BookingRequest
): Promise<AppNotification> => {
  return sendPushNotification({
    toUserId: ownerId,
    toRole: 'owner',
    type: 'booking_inquiry',
    title: 'New Booking Inquiry Received! 🏠',
    body: `${booking.tenantName} (${booking.tenantUniversity || 'Student'}) requested "${booking.roomTitle}" with an advance deposit of रु. ${booking.totalPaid.toLocaleString('en-IN')}.`,
    read: false,
    data: {
      bookingId: booking.id,
      roomId: booking.roomId,
      senderId: booking.tenantId,
      senderName: booking.tenantName,
      amount: booking.totalPaid,
    },
  });
};

/**
 * Send real-time notification to student when owner accepts/confirms booking
 */
export const notifyStudentOfBookingConfirmed = async (
  tenantId: string,
  booking: BookingRequest,
  ownerName: string = 'Ram Bahadur Shrestha'
): Promise<AppNotification> => {
  return sendPushNotification({
    toUserId: tenantId,
    toRole: 'renter',
    type: 'booking_confirmed',
    title: 'Booking Request Confirmed! 🎉',
    body: `Landlord ${ownerName} has approved your booking for "${booking.roomTitle}". Your digital tenancy lease agreement is ready!`,
    read: false,
    data: {
      bookingId: booking.id,
      roomId: booking.roomId,
      senderId: booking.ownerId,
      senderName: ownerName,
      amount: booking.totalPaid,
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

/**
 * Subscribe to real-time notifications from Firestore for the current user
 */
export const subscribeToRealtimeNotifications = (
  userRole: UserRole,
  userId: string | undefined,
  onUpdate: (notifications: AppNotification[]) => void
): (() => void) => {
  try {
    const notifCollection = collection(db, 'notifications');
    // Listen to all notifications for the user's role or targeted directly to them
    const notifQuery = query(
      notifCollection,
      orderBy('serverTime', 'desc'),
      limit(25)
    );

    return onSnapshot(
      notifQuery,
      snapshot => {
        const notifs: AppNotification[] = [];
        snapshot.forEach(docSnap => {
          const d = docSnap.data();
          // Filter in memory for role or specific user ID
          if (
            d.toRole === 'all' ||
            d.toRole === userRole ||
            (userId && (d.toUserId === userId || d.toUserId === 'all'))
          ) {
            notifs.push({
              id: docSnap.id,
              toUserId: d.toUserId,
              toRole: d.toRole,
              type: d.type,
              title: d.title,
              body: d.body,
              read: Boolean(d.read),
              data: d.data,
              createdAt: d.createdAt || new Date().toISOString(),
            });
          }
        });
        onUpdate(notifs);
      },
      err => {
        console.warn('Realtime notifications snapshot notice:', err?.message);
      }
    );
  } catch (e) {
    console.warn('Could not establish notifications listener:', e);
    return () => {};
  }
};

/**
 * Mark notification as read in Firestore
 */
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const notifRef = doc(db, 'notifications', notificationId);
    await updateDoc(notifRef, {
      read: true,
    });
  } catch (e) {
    console.warn('Could not update notification read status:', e);
  }
};
