import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateOutletInput,
  UpdateOutletFullInput,
  UpdateOutletSettingsInput,
} from '@sharon/shared';
import { dashboardQueryKeys } from '../api/queryKeys';
import {
  createOutlet,
  deleteOutlet,
  getOutlets,
  updateOutlet,
  updateOutletSettings,
} from '../services/outlet.service';

export function useOutletsQuery(enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.outlets.list,
    queryFn: getOutlets,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateOutletMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateOutletInput) => createOutlet(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.outlets.list,
      });
    },
  });
}

export function useUpdateOutletMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      outletBusinessId,
      payload,
    }: {
      outletBusinessId: string;
      payload: UpdateOutletFullInput;
    }) => updateOutlet(outletBusinessId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.outlets.list,
      });
    },
  });
}

export function useUpdateOutletSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      outletBusinessId,
      payload,
    }: {
      outletBusinessId: string;
      payload: UpdateOutletSettingsInput;
    }) => updateOutletSettings(outletBusinessId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.outlets.list,
      });
    },
  });
}

export function useDeleteOutletMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (outletBusinessId: string) => deleteOutlet(outletBusinessId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.outlets.list,
      });
    },
  });
}
