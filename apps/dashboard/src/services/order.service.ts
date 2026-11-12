import type {
  ApiSuccessEnvelope,
  ContactlessOrder,
  UpdateOrderStatusInput,
  VerifyPaymentInput,
} from '@sharon/shared';
import { axiosClient } from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/endpoints';
import type {
  OrderHistoryFilters,
  OrderHistoryResponse,
} from '../types/dashboard';

export async function getLiveOrders(
  outletBusinessId?: string | null,
): Promise<ContactlessOrder[]> {
  const params = outletBusinessId ? { outletBusinessId } : undefined;
  const { data } = await axiosClient.get<
    ApiSuccessEnvelope<ContactlessOrder[] | { orders: ContactlessOrder[] }>
  >(API_ENDPOINTS.ORDER.GET_LIVE_ORDERS, { params });

  const payload = data.data;
  if (Array.isArray(payload)) {
    return payload;
  }
  return payload.orders ?? [];
}

export async function getOrderHistory(
  filters: OrderHistoryFilters,
): Promise<OrderHistoryResponse> {
  const params: Record<string, string | number> = {
    page: filters.page,
    limit: filters.limit,
  };
  if (filters.outletBusinessId) {
    params.outletBusinessId = filters.outletBusinessId;
  }
  if (filters.orderStatus) {
    params.orderStatus = filters.orderStatus;
  }
  if (filters.paymentStatus) {
    params.paymentStatus = filters.paymentStatus;
  }
  if (filters.search?.trim()) {
    params.search = filters.search.trim();
  }

  const { data } = await axiosClient.get<
    ApiSuccessEnvelope<OrderHistoryResponse>
  >(API_ENDPOINTS.ORDER.GET_ORDER_HISTORY, { params });

  return data.data;
}

export async function updateOrderStatus(
  orderBusinessId: string,
  payload: UpdateOrderStatusInput,
): Promise<ContactlessOrder> {
  const { data } = await axiosClient.patch<
    ApiSuccessEnvelope<ContactlessOrder>
  >(API_ENDPOINTS.ORDER.UPDATE_ORDER_STATUS(orderBusinessId), payload);
  return data.data;
}

export async function verifyOrderPayment(
  orderBusinessId: string,
  payload: VerifyPaymentInput,
): Promise<ContactlessOrder> {
  const { data } = await axiosClient.patch<
    ApiSuccessEnvelope<ContactlessOrder>
  >(API_ENDPOINTS.ORDER.VERIFY_ORDER_PAYMENT(orderBusinessId), payload);
  return data.data;
}
