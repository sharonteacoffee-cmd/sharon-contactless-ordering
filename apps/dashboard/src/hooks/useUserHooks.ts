import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateUserInput,
  ToggleUserStatusInput,
  UpdateUserInput,
} from '@sharon/shared';
import { dashboardQueryKeys } from '../api/queryKeys';
import {
  createManagedUser,
  getManagedUsers,
  toggleManagedUserStatus,
  updateManagedUser,
} from '../services/user.service';

export function useManagedUsersQuery(enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.users.list,
    queryFn: getManagedUsers,
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useCreateManagedUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateUserInput) => createManagedUser(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.users.list,
      });
    },
  });
}

export function useUpdateManagedUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userBusinessId,
      payload,
    }: {
      userBusinessId: string;
      payload: UpdateUserInput;
    }) => updateManagedUser(userBusinessId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.users.list,
      });
    },
  });
}

export function useToggleManagedUserStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userBusinessId,
      payload,
    }: {
      userBusinessId: string;
      payload: ToggleUserStatusInput;
    }) => toggleManagedUserStatus(userBusinessId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.users.list,
      });
    },
  });
}
