import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UpdateOrderStatusInput, VerifyPaymentInput } from '@sharon/shared';
import { dashboardQueryKeys } from '../api/queryKeys';
import {
  getLiveOrders,
  getOrderHistory,
  updateOrderStatus,
  verifyOrderPayment,
} from '../services/order.service';
import type { OrderHistoryFilters } from '../types/dashboard';

export function useLiveOrdersQuery(outletBusinessId: string | null) {
  return useQuery({
    queryKey: dashboardQueryKeys.orders.live(outletBusinessId),
    queryFn: () => getLiveOrders(outletBusinessId),
    staleTime: 30 * 1000,
  });
}

export function useOrderHistoryQuery(filters: OrderHistoryFilters) {
  return useQuery({
    queryKey: dashboardQueryKeys.orders.history(filters),
    queryFn: () => getOrderHistory(filters),
    placeholderData: (previousData) => previousData,
    staleTime: 30 * 1000,
  });
}

export function useUpdateOrderStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderBusinessId,
      payload,
    }: {
      orderBusinessId: string;
      payload: UpdateOrderStatusInput;
    }) => updateOrderStatus(orderBusinessId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.orders.all,
      });
    },
  });
}

export function useVerifyPaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderBusinessId,
      payload,
    }: {
      orderBusinessId: string;
      payload: VerifyPaymentInput;
    }) => verifyOrderPayment(orderBusinessId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.orders.all,
      });
    },
  });
}
