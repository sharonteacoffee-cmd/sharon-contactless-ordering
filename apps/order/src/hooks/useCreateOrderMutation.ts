import { useMutation } from '@tanstack/react-query';
import type { CreatePublicOrderInput } from '@sharon/shared';
import { createPublicOrder } from '@/services/publicOrder.service';

export function useCreateOrderMutation() {
  return useMutation({
    mutationFn: (payload: CreatePublicOrderInput) => createPublicOrder(payload),
  });
}
