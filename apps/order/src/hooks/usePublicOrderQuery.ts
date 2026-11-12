import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import { getPublicOrderById } from '@/services/publicOrder.service';

export function usePublicOrderQuery(orderBusinessId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.publicOrder(orderBusinessId ?? ''),
    queryFn: () => getPublicOrderById(orderBusinessId ?? ''),
    enabled: Boolean(orderBusinessId),
    staleTime: 10_000,
    retry: 1,
  });
}
