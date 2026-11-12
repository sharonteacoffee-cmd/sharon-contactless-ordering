import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getMessaging,
  getToken,
  onMessage,
  type MessagePayload,
} from 'firebase/messaging';

function getFirebaseWebConfig() {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY?.trim() || '';
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() || '';
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim() || '';
  const storageBucket =
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim() || '';
  const messagingSenderId =
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() || '';
  const appId = import.meta.env.VITE_FIREBASE_APP_ID?.trim() || '';
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY?.trim() || '';

  return {
    apiKey,
    authDomain: authDomain || undefined,
    projectId,
    storageBucket: storageBucket || undefined,
    messagingSenderId,
    appId,
    vapidKey,
  };
}

export function isFirebaseWebPushConfigured(): boolean {
  const config = getFirebaseWebConfig();
  return Boolean(
    config.apiKey &&
      config.projectId &&
      config.messagingSenderId &&
      config.appId &&
      config.vapidKey,
  );
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

function getOrInitializeFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }
  const { vapidKey: _vapidKey, ...firebaseOptions } = getFirebaseWebConfig();
  return initializeApp(firebaseOptions);
}

export async function obtainStaffFcmToken(): Promise<string | null> {
  if (!isPushSupported() || !isFirebaseWebPushConfigured()) {
    return null;
  }

  const permission =
    Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();

  if (permission !== 'granted') {
    return null;
  }

  const serviceWorkerRegistration = await navigator.serviceWorker.register(
    '/firebase-messaging-sw.js',
    { scope: '/' },
  );
  await navigator.serviceWorker.ready;

  const { vapidKey } = getFirebaseWebConfig();
  const messaging = getMessaging(getOrInitializeFirebaseApp());
  const fcmToken = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration,
  });

  return fcmToken ? fcmToken.trim() : null;
}

export function subscribeStaffForegroundPush(
  onPayload: (payload: MessagePayload) => void,
): () => void {
  if (!isPushSupported() || !isFirebaseWebPushConfigured()) {
    return () => undefined;
  }
  if (Notification.permission !== 'granted') {
    return () => undefined;
  }

  const messaging = getMessaging(getOrInitializeFirebaseApp());
  return onMessage(messaging, onPayload);
}
