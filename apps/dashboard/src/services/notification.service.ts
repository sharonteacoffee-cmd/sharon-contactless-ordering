import type {
  ApiSuccessEnvelope,
  PushNotificationStatus,
  RegisterPushTokenResult,
  RegisterStaffPushTokenInput,
  UnregisterPushTokenInput,
} from '@sharon/shared';
import { axiosClient } from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/endpoints';

export async function getStaffPushStatus(): Promise<PushNotificationStatus> {
  const { data } = await axiosClient.get<
    ApiSuccessEnvelope<PushNotificationStatus>
  >(API_ENDPOINTS.NOTIFICATION.GET_STATUS);
  return data.data;
}

export async function registerStaffPushDevice(
  payload: RegisterStaffPushTokenInput,
): Promise<RegisterPushTokenResult> {
  const { data } = await axiosClient.post<
    ApiSuccessEnvelope<RegisterPushTokenResult>
  >(API_ENDPOINTS.NOTIFICATION.REGISTER_STAFF, payload);
  return data.data;
}

export async function unregisterStaffPushDevice(
  payload: UnregisterPushTokenInput,
): Promise<{ unregistered: boolean }> {
  const { data } = await axiosClient.post<
    ApiSuccessEnvelope<{ unregistered: boolean }>
  >(API_ENDPOINTS.NOTIFICATION.UNREGISTER_STAFF, payload);
  return data.data ?? { unregistered: true };
}
