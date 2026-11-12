import { unwrapApiGet } from '@/api/axiosClient';
import { PUBLIC_ENDPOINTS } from '@/api/endpoints';
import type { PublicMenuResponse } from '@/types/order';

export async function getPublicMenu(outletSlug: string): Promise<PublicMenuResponse> {
  return unwrapApiGet<PublicMenuResponse>(
    PUBLIC_ENDPOINTS.getPublicMenu(outletSlug),
  );
}
