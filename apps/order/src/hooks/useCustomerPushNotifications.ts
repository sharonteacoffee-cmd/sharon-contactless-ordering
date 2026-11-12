import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toApiClientError } from '@/api/axiosClient';
import { queryKeys } from '@/api/queryKeys';
import {
  registerCustomerPushDevice,
  unregisterCustomerPushDevice,
} from '@/services/notification.service';
import { useCustomerAuthStore } from '@/stores/useCustomerAuthStore';
import {
  getBrowserNotificationPermission,
  isFirebaseWebPushConfigured,
  isPushSupported,
  obtainCustomerFcmToken,
  subscribeCustomerForegroundPush,
  type CustomerForegroundPushPayload,
} from '@/utils/firebaseMessaging';

const PUSH_PREF_STORAGE_KEY = 'sharon_customer_push_pref_v1';

interface StoredPushPref {
  optedIn: boolean;
  lastToken: string | null;
}

function readPushPref(): StoredPushPref {
  if (typeof window === 'undefined') {
    return { optedIn: false, lastToken: null };
  }
  try {
    const raw = window.localStorage.getItem(PUSH_PREF_STORAGE_KEY);
    if (!raw) {
      return { optedIn: false, lastToken: null };
    }
    const parsed = JSON.parse(raw) as Partial<StoredPushPref>;
    return {
      optedIn: Boolean(parsed.optedIn),
      lastToken: typeof parsed.lastToken === 'string' ? parsed.lastToken : null,
    };
  } catch {
    return { optedIn: false, lastToken: null };
  }
}

function writePushPref(pref: StoredPushPref): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(PUSH_PREF_STORAGE_KEY, JSON.stringify(pref));
  } catch {
    // Ignore storage quota / private mode failures
  }
}

export interface UseCustomerPushOptions {
  orderBusinessId?: string;
  outletSlug?: string;
}

export function useCustomerPushNotifications(options?: UseCustomerPushOptions) {
  const queryClient = useQueryClient();
  const customerAccessToken = useCustomerAuthStore((state) => state.customerAccessToken);

  const initialPref = readPushPref();
  const [optedIn, setOptedIn] = useState<boolean>(initialPref.optedIn);
  const [fcmToken, setFcmToken] = useState<string | null>(initialPref.lastToken);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    getBrowserNotificationPermission(),
  );
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [foregroundToast, setForegroundToast] = useState<CustomerForegroundPushPayload | null>(
    null,
  );

  const lastRegisteredKeyRef = useRef<string | null>(null);

  const isSupported = isPushSupported();
  const isConfigured = isFirebaseWebPushConfigured();
  const isActive =
    isSupported && isConfigured && permission === 'granted' && optedIn && Boolean(fcmToken);

  const orderBusinessId = options?.orderBusinessId;
  const outletSlug = options?.outletSlug;

  // Auto-sync token context (orderBusinessId / outletSlug / customer login) when already opted-in
  useEffect(() => {
    if (!isSupported || !isConfigured || !optedIn || permission !== 'granted') {
      return;
    }

    const authMarker = customerAccessToken ? 'auth' : 'anon';
    const syncKey = `${orderBusinessId ?? ''}|${outletSlug ?? ''}|${authMarker}`;
    if (lastRegisteredKeyRef.current === syncKey && fcmToken) {
      return;
    }

    let cancelled = false;

    const syncDeviceRegistration = async () => {
      try {
        const token = await obtainCustomerFcmToken();
        if (cancelled) {
          return;
        }
        await registerCustomerPushDevice({
          fcmToken: token,
          ...(orderBusinessId ? { orderBusinessId } : {}),
          ...(outletSlug ? { outletSlug } : {}),
        });
        if (cancelled) {
          return;
        }
        setFcmToken(token);
        writePushPref({ optedIn: true, lastToken: token });
        lastRegisteredKeyRef.current = syncKey;
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setPermission(getBrowserNotificationPermission());
          setError(toApiClientError(err).message);
        }
      }
    };

    void syncDeviceRegistration();

    return () => {
      cancelled = true;
    };
  }, [
    isSupported,
    isConfigured,
    optedIn,
    permission,
    orderBusinessId,
    outletSlug,
    customerAccessToken,
    fcmToken,
  ]);

  // Foreground FCM listener: shows in-app toast & refreshes order caches
  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    const unsubscribe = subscribeCustomerForegroundPush((payload) => {
      setForegroundToast(payload);
      void queryClient.invalidateQueries({ queryKey: ['publicOrder'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.customerOrders });
    });

    return () => {
      unsubscribe();
    };
  }, [isActive, queryClient]);

  // Auto-dismiss foreground toast after 6.5s
  useEffect(() => {
    if (!foregroundToast) {
      return undefined;
    }
    const timerId = window.setTimeout(() => {
      setForegroundToast(null);
    }, 6500);
    return () => {
      window.clearTimeout(timerId);
    };
  }, [foregroundToast]);

  const enablePushAlerts = useCallback(async () => {
    setError(null);
    if (!isSupported) {
      setError('Push notifications are not supported in this browser.');
      return;
    }
    if (!isConfigured) {
      setError('Push setup pending Firebase keys.');
      return;
    }

    setIsRegistering(true);
    try {
      const token = await obtainCustomerFcmToken();
      await registerCustomerPushDevice({
        fcmToken: token,
        ...(orderBusinessId ? { orderBusinessId } : {}),
        ...(outletSlug ? { outletSlug } : {}),
      });
      const authMarker = customerAccessToken ? 'auth' : 'anon';
      lastRegisteredKeyRef.current = `${orderBusinessId ?? ''}|${outletSlug ?? ''}|${authMarker}`;
      setPermission(getBrowserNotificationPermission());
      setOptedIn(true);
      setFcmToken(token);
      writePushPref({ optedIn: true, lastToken: token });
    } catch (err) {
      setPermission(getBrowserNotificationPermission());
      setError(toApiClientError(err).message);
    } finally {
      setIsRegistering(false);
    }
  }, [isSupported, isConfigured, orderBusinessId, outletSlug, customerAccessToken]);

  const disablePushAlerts = useCallback(async () => {
    setError(null);
    setIsRegistering(true);
    try {
      if (fcmToken) {
        await unregisterCustomerPushDevice({ fcmToken });
      }
    } catch {
      // Allow local opt-out even if network unregister fails
    } finally {
      lastRegisteredKeyRef.current = null;
      setOptedIn(false);
      setFcmToken(null);
      writePushPref({ optedIn: false, lastToken: null });
      setIsRegistering(false);
    }
  }, [fcmToken]);

  const dismissForegroundToast = useCallback(() => {
    setForegroundToast(null);
  }, []);

  return {
    isSupported,
    isConfigured,
    permission,
    isActive,
    isRegistering,
    error,
    foregroundToast,
    dismissForegroundToast,
    enablePushAlerts,
    disablePushAlerts,
  };
}
