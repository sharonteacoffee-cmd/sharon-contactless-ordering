import { query } from '../../database/connection';
import type {
  MenuCategoryDbRow,
  ModifierGroupDbRow,
  ModifierOptionDbRow,
  OutletMenuItemDbRow,
} from './publicMenu.dto';

export async function findActiveMenuCategories(): Promise<MenuCategoryDbRow[]> {
  const { rows } = await query<MenuCategoryDbRow>(
    `SELECT id, name, slug, sort_order
     FROM menu_categories
     WHERE is_active = true
     ORDER BY sort_order ASC, name ASC`,
  );
  return rows;
}

export async function findMenuItemsByOutletId(
  outletId: string,
): Promise<OutletMenuItemDbRow[]> {
  const { rows } = await query<OutletMenuItemDbRow>(
    `SELECT mi.id, mi.category_slug, mi.name, mi.slug, mi.description,
            mi.price::text AS base_price,
            omi.custom_price::text AS custom_price,
            mi.image_url, mi.is_vegetarian, mi.is_bestseller,
            COALESCE(omi.is_available, true) AS is_available,
            mi.sort_order
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

export async function findAllModifierGroups(): Promise<ModifierGroupDbRow[]> {
  const { rows } = await query<ModifierGroupDbRow>(
    `SELECT id, name, display_type, is_required, min_selection, max_selection, sort_order
     FROM modifier_groups
     ORDER BY sort_order ASC, name ASC`,
  );
  return rows;
}

export async function findAllModifierOptions(): Promise<ModifierOptionDbRow[]> {
  const { rows } = await query<ModifierOptionDbRow>(
    `SELECT id, group_id, name, price_extra::text AS price_extra, is_default, sort_order
     FROM modifier_options
     ORDER BY sort_order ASC, name ASC`,
  );
  return rows;
}
