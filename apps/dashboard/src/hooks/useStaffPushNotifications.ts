import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { message, notification } from 'antd';
import { dashboardQueryKeys } from '../api/queryKeys';
import {
  registerStaffPushDevice,
  unregisterStaffPushDevice,
} from '../services/notification.service';
import { useDashboardUiStore } from '../stores/useDashboardUiStore';
import { extractApiErrorMessage } from '../utils/errorMessage';
import {
  isFirebaseWebPushConfigured,
  isPushSupported,
  obtainStaffFcmToken,
  subscribeStaffForegroundPush,
} from '../utils/firebaseMessaging';
import { playOrderBellChime } from '../utils/soundChime';
import {
  usePushStatusQuery,
  useRegisterStaffPushMutation,
  useUnregisterStaffPushMutation,
} from './useNotificationHooks';

export type StaffPushUiState =
  | 'PUSH_ON'
  | 'ENABLE_PUSH'
  | 'PUSH_BLOCKED'
  | 'ENV_NEEDED';

function readNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
}

export function useStaffPushNotifications() {
  const queryClient = useQueryClient();
  const token = useDashboardUiStore((state) => state.token);
  const user = useDashboardUiStore((state) => state.user);
  const selectedOutletBusinessId = useDashboardUiStore(
    (state) => state.selectedOutletBusinessId,
  );
  const activePushToken = useDashboardUiStore(
    (state) => state.activePushToken,
  );
  const setActivePushToken = useDashboardUiStore(
    (state) => state.setActivePushToken,
  );

  const [permission, setPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => readNotificationPermission());

  const supported = isPushSupported();
  const firebaseConfigured = isFirebaseWebPushConfigured();
  const pushStatusQuery = usePushStatusQuery(Boolean(token && user));
  const registerMutation = useRegisterStaffPushMutation();
  const unregisterMutation = useUnregisterStaffPushMutation();

  const lastSyncedScopeRef = useRef<string | null>(null);

  const isPushEnabled =
    supported &&
    firebaseConfigured &&
    permission === 'granted' &&
    Boolean(activePushToken);

  let uiState: StaffPushUiState = 'ENABLE_PUSH';
  if (!supported || !firebaseConfigured) {
    uiState = 'ENV_NEEDED';
  } else if (permission === 'denied') {
    uiState = 'PUSH_BLOCKED';
  } else if (isPushEnabled) {
    uiState = 'PUSH_ON';
  }

  const labelMap: Record<StaffPushUiState, string> = {
    PUSH_ON: 'Push On',
    ENABLE_PUSH: 'Enable Push',
    PUSH_BLOCKED: 'Push Blocked',
    ENV_NEEDED: 'Firebase Env Needed',
  };

  const activeDeviceCount = pushStatusQuery.data?.activeDeviceCount ?? 0;

  let tooltip = 'Click to enable browser push notifications for new KDS orders.';
  if (!supported) {
    tooltip = 'Web push notifications are not supported in this browser.';
  } else if (!firebaseConfigured) {
    tooltip =
      'Configure VITE_FIREBASE_* keys in apps/dashboard/.env to enable Web Push.';
  } else if (permission === 'denied') {
    tooltip =
      'Browser notification permission is blocked. Allow notifications in site settings.';
  } else if (isPushEnabled) {
    const scopeLabel =
      user?.role === 'MD'
        ? selectedOutletBusinessId
          ? `outlet ${selectedOutletBusinessId}`
          : 'all outlets'
        : user?.outletName || user?.outletBusinessId || 'assigned outlet';
    tooltip = `Push alerts active for ${scopeLabel} (${activeDeviceCount} active device${activeDeviceCount === 1 ? '' : 's'}) — click to disable on this device.`;
  }

  useEffect(() => {
    if (
      !token ||
      !user ||
      !supported ||
      !firebaseConfigured ||
      permission !== 'granted'
    ) {
      return undefined;
    }

    const unsubscribe = subscribeStaffForegroundPush((payload) => {
      const { isAudioMuted } = useDashboardUiStore.getState();
      if (!isAudioMuted) {
        void playOrderBellChime(false);
      }

      const title =
        payload.notification?.title ||
        payload.data?.title ||
        'New Sharon KDS Alert';
      const description =
        payload.notification?.body ||
        payload.data?.body ||
        'A new contactless order update requires attention.';

      notification.info({
        message: title,
        description,
        placement: 'topRight',
        duration: 6,
      });

      void queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.orders.all,
      });
    });

    return unsubscribe;
  }, [firebaseConfigured, permission, queryClient, supported, token, user]);

  useEffect(() => {
    if (!token || !user || !isPushEnabled || !activePushToken) {
      lastSyncedScopeRef.current = null;
      return;
    }

    const outletBusinessId =
      user.role === 'MD'
        ? (selectedOutletBusinessId ?? undefined)
        : (user.outletBusinessId ?? undefined);
    const scopeKey = `${user.businessId}:${outletBusinessId ?? 'ALL'}:${activePushToken}`;

    if (
      lastSyncedScopeRef.current &&
      lastSyncedScopeRef.current !== scopeKey
    ) {
      lastSyncedScopeRef.current = scopeKey;
      void registerStaffPushDevice({
        fcmToken: activePushToken,
        outletBusinessId,
      })
        .then(() =>
          queryClient.invalidateQueries({
            queryKey: dashboardQueryKeys.notification.status,
          }),
        )
        .catch(() => undefined);
      return;
    }

    lastSyncedScopeRef.current = scopeKey;
  }, [
    activePushToken,
    isPushEnabled,
    queryClient,
    selectedOutletBusinessId,
    token,
    user,
  ]);

  const togglePushAlerts = useCallback(async () => {
    if (!supported) {
      message.warning(
        'Web push notifications are not supported in this browser.',
      );
      return;
    }

    if (!firebaseConfigured) {
      message.info(
        'Set VITE_FIREBASE_* keys in apps/dashboard/.env to enable Web Push alerts.',
      );
      return;
    }

    const currentPermission = readNotificationPermission();
    setPermission(currentPermission);

    if (currentPermission === 'denied') {
      message.warning(
        'Notifications are blocked in your browser site settings. Allow notifications and reload.',
      );
      return;
    }

    try {
      if (isPushEnabled && activePushToken) {
        await unregisterMutation.mutateAsync({ fcmToken: activePushToken });
        setActivePushToken(null);
        message.success('Push alerts disabled for this device.');
        return;
      }

      const fcmToken = await obtainStaffFcmToken();
      const updatedPermission = readNotificationPermission();
      setPermission(updatedPermission);

      if (!fcmToken) {
        if (updatedPermission === 'denied') {
          message.warning(
            'Notification permission was blocked by the browser.',
          );
        } else {
          message.info(
            'Notification permission was not granted or FCM token is unavailable.',
          );
        }
        return;
      }

      const outletBusinessId =
        user?.role === 'MD'
          ? (selectedOutletBusinessId ?? undefined)
          : (user?.outletBusinessId ?? undefined);

      await registerMutation.mutateAsync({
        fcmToken,
        outletBusinessId,
      });
      setActivePushToken(fcmToken);
      message.success('Push alerts enabled for new KDS orders.');
    } catch (error) {
      message.error(
        extractApiErrorMessage(
          error,
          'Could not update browser push notification settings.',
        ),
      );
    }
  }, [
    activePushToken,
    firebaseConfigured,
    isPushEnabled,
    registerMutation,
    selectedOutletBusinessId,
    setActivePushToken,
    supported,
    unregisterMutation,
    user,
  ]);

  const unregisterBeforeLogout = useCallback(async () => {
    const currentToken = useDashboardUiStore.getState().activePushToken;
    if (!currentToken) {
      return;
    }

    try {
      await unregisterStaffPushDevice({ fcmToken: currentToken });
    } catch {
      // Never block user logout if push unregistration fails transiently.
    } finally {
      setActivePushToken(null);
    }
  }, [setActivePushToken]);

  return {
    uiState,
    label: labelMap[uiState],
    tooltip,
    isPushEnabled,
    isBusy: registerMutation.isPending || unregisterMutation.isPending,
    fcmConfiguredOnServer: pushStatusQuery.data?.fcmConfigured ?? false,
    activeDeviceCount,
    togglePushAlerts,
    unregisterBeforeLogout,
  };
}
