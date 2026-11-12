import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  RegisterStaffPushTokenInput,
  UnregisterPushTokenInput,
} from '@sharon/shared';
import { dashboardQueryKeys } from '../api/queryKeys';
import {
  getStaffPushStatus,
  registerStaffPushDevice,
  unregisterStaffPushDevice,
} from '../services/notification.service';

export function usePushStatusQuery(enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.notification.status,
    queryFn: getStaffPushStatus,
    enabled,
  });
}

export function useRegisterStaffPushMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RegisterStaffPushTokenInput) =>
      registerStaffPushDevice(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.notification.status,
      });
    },
  });
}

export function useUnregisterStaffPushMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UnregisterPushTokenInput) =>
      unregisterStaffPushDevice(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.notification.status,
      });
    },
  });
}
