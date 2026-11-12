import type {
  ApiSuccessEnvelope,
  CreateUserInput,
  ManagedUserRecord,
  ToggleUserStatusInput,
  UpdateUserInput,
} from '@sharon/shared';
import { axiosClient } from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/endpoints';

export async function getManagedUsers(): Promise<ManagedUserRecord[]> {
  const { data } = await axiosClient.get<
    ApiSuccessEnvelope<ManagedUserRecord[] | { users: ManagedUserRecord[] }>
  >(API_ENDPOINTS.USER.GET_USERS);

  const payload = data.data;
  if (Array.isArray(payload)) {
    return payload;
  }
  return payload.users ?? [];
}

export async function createManagedUser(
  payload: CreateUserInput,
): Promise<ManagedUserRecord> {
  const { data } = await axiosClient.post<
    ApiSuccessEnvelope<ManagedUserRecord>
  >(API_ENDPOINTS.USER.CREATE_USER, payload);
  return data.data;
}

export async function updateManagedUser(
  userBusinessId: string,
  payload: UpdateUserInput,
): Promise<ManagedUserRecord> {
  const { data } = await axiosClient.put<ApiSuccessEnvelope<ManagedUserRecord>>(
    API_ENDPOINTS.USER.UPDATE_USER(userBusinessId),
    payload,
  );
  return data.data;
}

export async function toggleManagedUserStatus(
  userBusinessId: string,
  payload: ToggleUserStatusInput,
): Promise<ManagedUserRecord> {
  const { data } = await axiosClient.patch<
    ApiSuccessEnvelope<ManagedUserRecord>
  >(API_ENDPOINTS.USER.TOGGLE_USER_STATUS(userBusinessId), payload);
  return data.data;
}
