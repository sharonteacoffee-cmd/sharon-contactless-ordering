import type {
  ApiSuccessEnvelope,
  GenerateQrInput,
  UpdateQrStatusInput,
} from '@sharon/shared';
import { axiosClient } from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/endpoints';
import type { QrCodeRecord } from '../types/dashboard';

export async function getQrCodes(): Promise<QrCodeRecord[]> {
  const { data } = await axiosClient.get<
    ApiSuccessEnvelope<QrCodeRecord[] | { qrCodes: QrCodeRecord[] }>
  >(API_ENDPOINTS.QR_MASTER.GET_QR_CODES);

  const payload = data.data;
  if (Array.isArray(payload)) {
    return payload;
  }
  return payload.qrCodes ?? [];
}

export async function generateQrCode(
  payload: GenerateQrInput,
): Promise<QrCodeRecord> {
  const { data } = await axiosClient.post<ApiSuccessEnvelope<QrCodeRecord>>(
    API_ENDPOINTS.QR_MASTER.GENERATE_QR_CODE,
    payload,
  );
  return data.data;
}

export async function updateQrStatus(
  qrBusinessId: string,
  payload: UpdateQrStatusInput,
): Promise<QrCodeRecord> {
  const { data } = await axiosClient.patch<ApiSuccessEnvelope<QrCodeRecord>>(
    API_ENDPOINTS.QR_MASTER.UPDATE_QR_STATUS(qrBusinessId),
    payload,
  );
  return data.data;
}
