import type { ApiSuccessEnvelope, ToggleStockInput } from '@sharon/shared';
import { axiosClient } from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/endpoints';
import type { OutletStockItem } from '../types/dashboard';

export async function getOutletStock(
  outletBusinessId: string,
): Promise<OutletStockItem[]> {
  const { data } = await axiosClient.get<
    ApiSuccessEnvelope<OutletStockItem[] | { items: OutletStockItem[] }>
  >(API_ENDPOINTS.OUTLET_STOCK.GET_OUTLET_STOCK(outletBusinessId));

  const payload = data.data;
  if (Array.isArray(payload)) {
    return payload;
  }
  return payload.items ?? [];
}

export interface ToggleOutletStockResult {
  outletBusinessId: string;
  menuItemId: string;
  isAvailable: boolean;
  customPrice: number | null;
  updatedAt: string;
}

export async function toggleOutletStock(
  outletBusinessId: string,
  menuItemId: string,
  payload: ToggleStockInput,
): Promise<ToggleOutletStockResult> {
  const { data } = await axiosClient.patch<
    ApiSuccessEnvelope<ToggleOutletStockResult>
  >(
    API_ENDPOINTS.OUTLET_STOCK.TOGGLE_ITEM_AVAILABILITY(
      outletBusinessId,
      menuItemId,
    ),
    payload,
  );
  return data.data;
}
