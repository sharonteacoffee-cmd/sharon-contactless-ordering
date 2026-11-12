import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import { getPublicMenu } from '@/services/publicMenu.service';

export function usePublicMenuQuery(outletSlug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.publicMenu(outletSlug ?? ''),
    queryFn: () => getPublicMenu(outletSlug ?? ''),
    enabled: Boolean(outletSlug),
    staleTime: 30_000,
    retry: 1,
  });
}
