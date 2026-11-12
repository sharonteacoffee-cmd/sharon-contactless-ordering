import { toUTCISOString, type ToggleStockInput } from '@sharon/shared';
import { assertOutletScope } from '../../middleware/authorize.middleware';
import { emitOutletStockChanged } from '../../socket/socketBroadcaster';
import type { AuthenticatedStaffUser } from '../../types/auth.types';
import { AppError } from '../../utils/appError';
import {
  findActiveMenuItemById,
  findOutletByBusinessId,
  findOutletStockItems,
  upsertOutletStockItem,
} from './outletStock.repository';

export interface OutletStockItemDto {
  menuItemId: string;
  name: string;
  slug: string;
  categorySlug: string;
  basePrice: number;
  customPrice: number | null;
  effectivePrice: number;
  isAvailable: boolean;
  imageUrl: string | null;
  updatedAt: string;
}

export async function getOutletStock(
  user: AuthenticatedStaffUser,
  outletBusinessId: string,
): Promise<OutletStockItemDto[]> {
  const outlet = await findOutletByBusinessId(outletBusinessId);
  if (!outlet) {
    throw new AppError(404, 'OUTLET_NOT_FOUND', 'Outlet not found.');
  }

  assertOutletScope(user, outlet.id);

  const rows = await findOutletStockItems(outlet.id);
  return rows.map((row) => {
    const basePrice = Number(Number(row.base_price).toFixed(2));
    const customPrice =
      row.custom_price !== null ? Number(Number(row.custom_price).toFixed(2)) : null;

    return {
      menuItemId: row.menu_item_id,
      name: row.name,
      slug: row.slug,
      categorySlug: row.category_slug,
      basePrice,
      customPrice,
      effectivePrice: customPrice ?? basePrice,
      isAvailable: row.is_available,
      imageUrl: row.image_url,
      updatedAt: toUTCISOString(row.updated_at),
    };
  });
}

export async function toggleOutletStock(
  user: AuthenticatedStaffUser,
  outletBusinessId: string,
  menuItemId: string,
  input: ToggleStockInput,
): Promise<{
  outletBusinessId: string;
  menuItemId: string;
  isAvailable: boolean;
  customPrice: number | null;
  updatedAt: string;
}> {
  const outlet = await findOutletByBusinessId(outletBusinessId);
  if (!outlet) {
    throw new AppError(404, 'OUTLET_NOT_FOUND', 'Outlet not found.');
  }

  assertOutletScope(user, outlet.id);

  const menuItem = await findActiveMenuItemById(menuItemId);
  if (!menuItem) {
    throw new AppError(404, 'MENU_ITEM_NOT_FOUND', 'Menu item not found.');
  }

  const hasCustomPrice = input.customPrice !== undefined;
  const updated = await upsertOutletStockItem({
    outletId: outlet.id,
    menuItemId: menuItem.id,
    isAvailable: input.isAvailable,
    hasCustomPrice,
    customPrice: input.customPrice ?? null,
  });

  const customPrice =
    updated.custom_price !== null
      ? Number(Number(updated.custom_price).toFixed(2))
      : null;
  const updatedAtUtc = toUTCISOString(updated.updated_at);

  emitOutletStockChanged({
    outletId: outlet.id,
    outletSlug: outlet.slug,
    menuItemId: menuItem.id,
    isAvailable: updated.is_available,
    customPrice,
    updatedAt: updatedAtUtc,
  });

  return {
    outletBusinessId: outlet.business_id,
    menuItemId: menuItem.id,
    isAvailable: updated.is_available,
    customPrice,
    updatedAt: updatedAtUtc,
  };
}
