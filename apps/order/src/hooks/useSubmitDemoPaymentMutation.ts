import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { SubmitDemoPaymentInput } from '@sharon/shared';
import { queryKeys } from '@/api/queryKeys';
import { submitDemoPayment } from '@/services/publicOrder.service';

interface SubmitDemoPaymentVariables {
  orderBusinessId: string;
  payload: SubmitDemoPaymentInput;
}

export function useSubmitDemoPaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderBusinessId, payload }: SubmitDemoPaymentVariables) =>
      submitDemoPayment(orderBusinessId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.publicOrder(data.orderBusinessId),
      });
    },
  });
}
