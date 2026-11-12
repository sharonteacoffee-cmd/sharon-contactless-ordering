import { query } from '../../database/connection';

export interface OutletLookupRow {
  id: string;
  business_id: string;
  slug: string;
  name: string;
}

export interface OutletStockDbRow {
  menu_item_id: string;
  name: string;
  slug: string;
  category_slug: string;
  base_price: string;
  custom_price: string | null;
  is_available: boolean;
  image_url: string | null;
  updated_at: Date;
}

export async function findOutletByBusinessId(
  outletBusinessId: string,
): Promise<OutletLookupRow | null> {
  const { rows } = await query<OutletLookupRow>(
    `SELECT id, business_id, slug, name
     FROM outlets
     WHERE business_id = $1`,
    [outletBusinessId],
  );
  return rows[0] ?? null;
}

export async function findOutletStockItems(
  outletId: string,
): Promise<OutletStockDbRow[]> {
  const { rows } = await query<OutletStockDbRow>(
    `SELECT mi.id AS menu_item_id, mi.name, mi.slug, mi.category_slug,
            mi.price::text AS base_price,
            omi.custom_price::text AS custom_price,
            COALESCE(omi.is_available, true) AS is_available,
            mi.image_url,
            COALESCE(omi.updated_at, mi.updated_at) AS updated_at
     FROM menu_items mi
     INNER JOIN menu_categories mc
       ON mc.slug = mi.category_slug
     LEFT JOIN outlet_menu_items omi
       ON omi.menu_item_id = mi.id AND omi.outlet_id = $1
     WHERE mi.is_active = true
       AND mc.is_active = true
     ORDER BY mc.sort_order ASC, mi.sort_order ASC, mi.name ASC`,
    [outletId],
  );
  return rows;
}

export async function findActiveMenuItemById(
  menuItemId: string,
): Promise<{ id: string; name: string } | null> {
  const { rows } = await query<{ id: string; name: string }>(
    'SELECT id, name FROM menu_items WHERE id = $1 AND is_active = true',
    [menuItemId],
  );
  return rows[0] ?? null;
}

export async function upsertOutletStockItem(params: {
  outletId: string;
  menuItemId: string;
  isAvailable: boolean;
  hasCustomPrice: boolean;
  customPrice: number | null;
}): Promise<{
  is_available: boolean;
  custom_price: string | null;
  updated_at: Date;
}> {
  const { rows } = await query<{
    is_available: boolean;
    custom_price: string | null;
    updated_at: Date;
  }>(
    `INSERT INTO outlet_menu_items (outlet_id, menu_item_id, is_available, custom_price, updated_at)
     VALUES ($1, $2, $3, CASE WHEN $4 THEN $5::decimal ELSE NULL END, CURRENT_TIMESTAMP)
     ON CONFLICT (outlet_id, menu_item_id) DO UPDATE
     SET is_available = EXCLUDED.is_available,
         custom_price = CASE
           WHEN $4 THEN $5::decimal
           ELSE outlet_menu_items.custom_price
         END,
         updated_at = CURRENT_TIMESTAMP
     RETURNING is_available, custom_price::text AS custom_price, updated_at`,
    [
      params.outletId,
      params.menuItemId,
      params.isAvailable,
      params.hasCustomPrice,
      params.customPrice !== null ? params.customPrice.toFixed(2) : null,
    ],
  );
  return rows[0];
}
