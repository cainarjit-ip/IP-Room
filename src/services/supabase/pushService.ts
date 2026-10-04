import { supabase, isValidUUID } from '../../lib/supabase';

// Standard VAPID public key for Web Push
const VAPID_PUBLIC_KEY =
  (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY ||
  'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

/**
 * Convert a base64url string to Uint8Array for PushManager applicationServerKey
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if Web Push & Service Workers are supported in the current environment
 */
export const isPushSupported = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
};

/**
 * Register the Service Worker
 */
export const registerPushServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (err) {
    console.error('Service Worker registration failed:', err);
    return null;
  }
};

/**
 * Subscribe a Room Owner to Web Push Notifications on their phone/desktop
 */
export const subscribeOwnerToPush = async (
  userId: string
): Promise<{ success: boolean; error: string | null }> => {
  if (!isValidUUID(userId)) {
    return { success: false, error: 'Valid user UUID required for push subscription.' };
  }

  if (!isPushSupported()) {
    return {
      success: false,
      error: 'Push notifications are not supported in this browser. Try Chrome, Edge, or Safari on iOS 16.4+.',
    };
  }

  try {
    // 1. Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        error: permission === 'denied'
          ? 'Notification permission was denied. Please allow notifications in your browser settings.'
          : 'Notification permission was dismissed.',
      };
    }

    // 2. Ensure Service Worker is ready
    const registration = await registerPushServiceWorker();
    if (!registration) {
      return { success: false, error: 'Could not initialize service worker.' };
    }

    // 3. Subscribe with VAPID key
    const convertedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey as unknown as BufferSource,
      });
    }

    const p256dhKey = subscription.getKey('p256dh');
    const authKey = subscription.getKey('auth');

    if (!p256dhKey || !authKey) {
      return { success: false, error: 'Push subscription keys could not be generated.' };
    }

    const p256dh = btoa(String.fromCharCode(...new Uint8Array(p256dhKey)));
    const auth = btoa(String.fromCharCode(...new Uint8Array(authKey)));
    const endpoint = subscription.endpoint;

    // 4. Save subscription into Supabase push_subscriptions table
    const { error: dbError } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint,
        p256dh,
        auth,
      } as any,
      { onConflict: 'endpoint' }
    );

    if (dbError) {
      console.error('Failed to save push subscription in Supabase:', dbError);
      return { success: false, error: dbError.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error subscribing to push:', err);
    return { success: false, error: err?.message || 'Failed to enable mobile notifications.' };
  }
};

/**
 * Unsubscribe user from Web Push
 */
export const unsubscribeOwnerFromPush = async (
  userId: string
): Promise<{ success: boolean; error: string | null }> => {
  if (!isPushSupported()) return { success: true, error: null };

  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (registration) {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint);

        await subscription.unsubscribe();
      }
    }
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error unsubscribing from push:', err);
    return { success: false, error: err?.message || 'Failed to unsubscribe.' };
  }
};

/**
 * Check if the current browser already has an active push subscription
 */
export const checkCurrentPushSubscription = async (): Promise<boolean> => {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!registration) return false;
    const subscription = await registration.pushManager.getSubscription();
    return Boolean(subscription);
  } catch (e) {
    return false;
  }
};
