import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MenuSyncMode } from '@sharon/shared';
import { dashboardQueryKeys } from '../api/queryKeys';
import {
  getSyncLogs,
  previewMenuSyncFromWebsite,
  syncMenuFromWebsite,
} from '../services/menuSync.service';

export function useSyncLogsQuery(enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.menuSync.logs,
    queryFn: getSyncLogs,
    enabled,
    staleTime: 60 * 1000,
  });
}

export function usePreviewMenuSyncMutation() {
  return useMutation({
    mutationFn: previewMenuSyncFromWebsite,
  });
}

export function useSyncMenuMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { syncMode: MenuSyncMode }) =>
      syncMenuFromWebsite(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.menuSync.logs,
      });
      void queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.stock.all,
      });
    },
  });
}
