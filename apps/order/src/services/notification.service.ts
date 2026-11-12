import type {
  RegisterCustomerPushTokenInput,
  RegisterPushTokenResult,
  UnregisterPushTokenInput,
} from '@sharon/shared';
import { unwrapApiPost } from '@/api/axiosClient';
import { PUBLIC_ENDPOINTS } from '@/api/endpoints';

export async function registerCustomerPushDevice(
  payload: RegisterCustomerPushTokenInput,
): Promise<RegisterPushTokenResult> {
  return unwrapApiPost<RegisterPushTokenResult, RegisterCustomerPushTokenInput>(
    PUBLIC_ENDPOINTS.NOTIFICATION.REGISTER_CUSTOMER,
    payload,
  );
}

export async function unregisterCustomerPushDevice(
  payload: UnregisterPushTokenInput,
): Promise<void> {
  await unwrapApiPost<unknown, UnregisterPushTokenInput>(
    PUBLIC_ENDPOINTS.NOTIFICATION.UNREGISTER_CUSTOMER,
    payload,
  );
}
