import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import { getPublicOutlets } from '@/services/publicOutlet.service';

export function usePublicOutletsQuery() {
  return useQuery({
    queryKey: queryKeys.publicOutlets,
    queryFn: getPublicOutlets,
    staleTime: 60_000,
    retry: 1,
  });
}
