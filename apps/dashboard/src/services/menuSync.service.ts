import type {
  ApiSuccessEnvelope,
  MenuSyncMode,
  MenuSyncPreviewResult,
  MenuSyncResult,
} from '@sharon/shared';
import { axiosClient } from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/endpoints';
import type { MenuSyncLog } from '../types/dashboard';

export async function previewMenuSyncFromWebsite(): Promise<MenuSyncPreviewResult> {
  const { data } = await axiosClient.get<
    ApiSuccessEnvelope<MenuSyncPreviewResult>
  >(API_ENDPOINTS.MENU_SYNC.PREVIEW_FROM_WEBSITE);
  return data.data;
}

export async function syncMenuFromWebsite(input: {
  syncMode: MenuSyncMode;
}): Promise<MenuSyncResult> {
  const { data } = await axiosClient.post<ApiSuccessEnvelope<MenuSyncResult>>(
    API_ENDPOINTS.MENU_SYNC.SYNC_FROM_WEBSITE,
    input,
  );
  return data.data;
}

export async function getSyncLogs(): Promise<MenuSyncLog[]> {
  const { data } = await axiosClient.get<
    ApiSuccessEnvelope<MenuSyncLog[] | { logs: MenuSyncLog[] }>
  >(API_ENDPOINTS.MENU_SYNC.GET_SYNC_LOGS);

  const payload = data.data;
  if (Array.isArray(payload)) {
    return payload;
  }
  return payload.logs ?? [];
}
