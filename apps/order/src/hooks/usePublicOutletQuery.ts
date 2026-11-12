import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import { getPublicOutletBySlug } from '@/services/publicOutlet.service';

export function usePublicOutletQuery(
  outletSlug: string | undefined,
  qrToken?: string | null,
) {
  return useQuery({
    queryKey: queryKeys.publicOutlet(outletSlug ?? '', qrToken),
    queryFn: () => getPublicOutletBySlug(outletSlug ?? '', qrToken ?? undefined),
    enabled: Boolean(outletSlug),
    staleTime: 30_000,
    retry: false,
  });
}
