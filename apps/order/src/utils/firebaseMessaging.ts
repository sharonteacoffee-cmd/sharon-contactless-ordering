import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import { getMessaging, getToken, onMessage, type MessagePayload } from 'firebase/messaging';

export interface CustomerForegroundPushPayload {
  title: string;
  body: string;
  link?: string;
  orderBusinessId?: string;
}

function getFirebaseWebConfig(): { options: FirebaseOptions; vapidKey: string } {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY?.trim() || '';
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() || '';
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim() || '';
  const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim() || '';
  const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() || '';
  const appId = import.meta.env.VITE_FIREBASE_APP_ID?.trim() || '';
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY?.trim() || '';

  return {
    options: {
      apiKey,
      ...(authDomain ? { authDomain } : {}),
      projectId,
      ...(storageBucket ? { storageBucket } : {}),
      messagingSenderId,
      appId,
    },
    vapidKey,
  };
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator
  );
}

export function isFirebaseWebPushConfigured(): boolean {
  const { options, vapidKey } = getFirebaseWebConfig();
  return Boolean(
    options.apiKey &&
      options.projectId &&
      options.messagingSenderId &&
      options.appId &&
      vapidKey,
  );
}

export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
}

function getOrInitializeFirebaseApp() {
  const { options } = getFirebaseWebConfig();
  return getApps().length > 0 ? getApp() : initializeApp(options);
}

export async function obtainCustomerFcmToken(): Promise<string> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported in this browser.');
  }
  if (!isFirebaseWebPushConfigured()) {
    throw new Error('Push setup pending Firebase keys.');
  }

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }

  if (permission === 'denied') {
    throw new Error('Browser notification permission is blocked. Enable notifications in browser settings.');
  }
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.');
  }

  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  await navigator.serviceWorker.ready;

  const { vapidKey } = getFirebaseWebConfig();
  const app = getOrInitializeFirebaseApp();
  const messaging = getMessaging(app);

  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    throw new Error('Could not obtain a push notification token from Firebase.');
  }

  return token;
}

export function subscribeCustomerForegroundPush(
  onPayload: (payload: CustomerForegroundPushPayload) => void,
): () => void {
  if (
    !isPushSupported() ||
    !isFirebaseWebPushConfigured() ||
    Notification.permission !== 'granted'
  ) {
    return () => {};
  }

  const app = getOrInitializeFirebaseApp();
  const messaging = getMessaging(app);

  return onMessage(messaging, (message: MessagePayload) => {
    const title =
      message.notification?.title ||
      message.data?.title ||
      'Sharon Tea & Coffee — Order Update';
    const body =
      message.notification?.body ||
      message.data?.body ||
      'Your order status just updated.';
    const link = message.fcmOptions?.link || message.data?.link;
    const orderBusinessId = message.data?.orderBusinessId;

    onPayload({
      title,
      body,
      link,
      orderBusinessId,
    });
  });
}
