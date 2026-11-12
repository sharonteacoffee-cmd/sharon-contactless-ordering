import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GenerateQrInput, UpdateQrStatusInput } from '@sharon/shared';
import { dashboardQueryKeys } from '../api/queryKeys';
import {
  generateQrCode,
  getQrCodes,
  updateQrStatus,
} from '../services/qrMaster.service';

export function useQrCodesQuery(enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.qrMaster.list,
    queryFn: getQrCodes,
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useGenerateQrMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: GenerateQrInput) => generateQrCode(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.qrMaster.list,
      });
    },
  });
}

export function useUpdateQrStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      qrBusinessId,
      payload,
    }: {
      qrBusinessId: string;
      payload: UpdateQrStatusInput;
    }) => updateQrStatus(qrBusinessId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.qrMaster.list,
      });
    },
  });
}
