import type {
  ApiSuccessEnvelope,
  CreateOutletInput,
  UpdateOutletFullInput,
  UpdateOutletSettingsInput,
} from '@sharon/shared';
import { axiosClient } from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/endpoints';
import type { OutletConfig } from '../types/dashboard';

export async function getOutlets(): Promise<OutletConfig[]> {
  const { data } = await axiosClient.get<
    ApiSuccessEnvelope<OutletConfig[] | { outlets: OutletConfig[] }>
  >(API_ENDPOINTS.OUTLET.GET_OUTLETS);

  const payload = data.data;
  if (Array.isArray(payload)) {
    return payload;
  }
  return payload.outlets ?? [];
}

export async function createOutlet(
  payload: CreateOutletInput,
): Promise<OutletConfig> {
  const { data } = await axiosClient.post<ApiSuccessEnvelope<OutletConfig>>(
    API_ENDPOINTS.OUTLET.CREATE_OUTLET,
    payload,
  );
  return data.data;
}

export async function updateOutlet(
  outletBusinessId: string,
  payload: UpdateOutletFullInput,
): Promise<OutletConfig> {
  const { data } = await axiosClient.put<ApiSuccessEnvelope<OutletConfig>>(
    API_ENDPOINTS.OUTLET.UPDATE_OUTLET(outletBusinessId),
    payload,
  );
  return data.data;
}

export async function updateOutletSettings(
  outletBusinessId: string,
  payload: UpdateOutletSettingsInput,
): Promise<OutletConfig> {
  const { data } = await axiosClient.put<ApiSuccessEnvelope<OutletConfig>>(
    API_ENDPOINTS.OUTLET.UPDATE_OUTLET_SETTINGS(outletBusinessId),
    payload,
  );
  return data.data;
}

export async function deleteOutlet(
  outletBusinessId: string,
): Promise<{ businessId: string; deleted: boolean; deactivated: boolean }> {
  const { data } = await axiosClient.delete<
    ApiSuccessEnvelope<{ businessId: string; deleted: boolean; deactivated: boolean }>
  >(API_ENDPOINTS.OUTLET.DELETE_OUTLET(outletBusinessId));
  return data.data;
}
