import type {
  CreatePublicOrderInput,
  OrderTrackingInfo,
  SubmitDemoPaymentInput,
} from '@sharon/shared';
import { unwrapApiGet, unwrapApiPost } from '@/api/axiosClient';
import { PUBLIC_ENDPOINTS } from '@/api/endpoints';
import type {
  CreatePublicOrderResponse,
  SubmitDemoPaymentResponse,
} from '@/types/order';

export async function createPublicOrder(
  payload: CreatePublicOrderInput,
): Promise<CreatePublicOrderResponse> {
  return unwrapApiPost<CreatePublicOrderResponse, CreatePublicOrderInput>(
    PUBLIC_ENDPOINTS.CREATE_PUBLIC_ORDER,
    payload,
  );
}

export async function submitDemoPayment(
  orderBusinessId: string,
  payload: SubmitDemoPaymentInput,
): Promise<SubmitDemoPaymentResponse> {
  return unwrapApiPost<SubmitDemoPaymentResponse, SubmitDemoPaymentInput>(
    PUBLIC_ENDPOINTS.submitDemoPayment(orderBusinessId),
    payload,
  );
}

export async function getPublicOrderById(
  orderBusinessId: string,
): Promise<OrderTrackingInfo> {
  return unwrapApiGet<OrderTrackingInfo>(
    PUBLIC_ENDPOINTS.getPublicOrderById(orderBusinessId),
  );
}
