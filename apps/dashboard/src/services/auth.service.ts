import type { ApiSuccessEnvelope, StaffLoginInput } from '@sharon/shared';
import { axiosClient } from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/endpoints';
import type { AuthLoginData, StaffUser } from '../types/dashboard';

export async function loginStaff(
  payload: StaffLoginInput,
): Promise<AuthLoginData> {
  const { data } = await axiosClient.post<ApiSuccessEnvelope<AuthLoginData>>(
    API_ENDPOINTS.AUTH.LOGIN,
    payload,
  );
  return data.data;
}

export async function getCurrentProfile(): Promise<StaffUser> {
  const { data } = await axiosClient.get<ApiSuccessEnvelope<StaffUser>>(
    API_ENDPOINTS.AUTH.GET_CURRENT_PROFILE,
  );
  return data.data;
}
