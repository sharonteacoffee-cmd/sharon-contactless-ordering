import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ToggleStockInput } from '@sharon/shared';
import { dashboardQueryKeys } from '../api/queryKeys';
import { getOutletStock, toggleOutletStock } from '../services/stock.service';

export function useOutletStockQuery(outletBusinessId: string | null) {
  return useQuery({
    queryKey: dashboardQueryKeys.stock.byOutlet(outletBusinessId ?? ''),
    queryFn: () => getOutletStock(outletBusinessId ?? ''),
    enabled: Boolean(outletBusinessId),
    staleTime: 60 * 1000,
  });
}

export function useToggleStockMutation(outletBusinessId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      menuItemId,
      payload,
    }: {
      menuItemId: string;
      payload: ToggleStockInput;
    }) => {
      if (!outletBusinessId) {
        throw new Error('Select an outlet before updating stock');
      }
      return toggleOutletStock(outletBusinessId, menuItemId, payload);
    },
    onSuccess: () => {
      if (outletBusinessId) {
        void queryClient.invalidateQueries({
          queryKey: dashboardQueryKeys.stock.byOutlet(outletBusinessId),
        });
      }
    },
  });
}
