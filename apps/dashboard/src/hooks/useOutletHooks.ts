import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UpdateOutletSettingsInput } from '@sharon/shared';
import { dashboardQueryKeys } from '../api/queryKeys';
import { getOutlets, updateOutletSettings } from '../services/outlet.service';

export function useOutletsQuery(enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.outlets.list,
    queryFn: getOutlets,
    enabled,
    staleTime: 5 * 60 * 1000,
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
