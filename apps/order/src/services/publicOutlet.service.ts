import type { OutletPublicInfo } from '@sharon/shared';
import { unwrapApiGet } from '@/api/axiosClient';
import { PUBLIC_ENDPOINTS } from '@/api/endpoints';

export async function getPublicOutlets(): Promise<OutletPublicInfo[]> {
  return unwrapApiGet<OutletPublicInfo[]>(PUBLIC_ENDPOINTS.GET_PUBLIC_OUTLETS);
}

export async function getPublicOutletBySlug(
  outletSlug: string,
  qrToken?: string,
): Promise<OutletPublicInfo> {
  return unwrapApiGet<OutletPublicInfo>(
    PUBLIC_ENDPOINTS.getPublicOutletBySlug(outletSlug),
    qrToken ? { qr: qrToken } : undefined,
  );
}
