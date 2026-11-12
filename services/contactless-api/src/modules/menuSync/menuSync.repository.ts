import type { PoolClient } from 'pg';
import { query } from '../../database/connection';

export interface MainWebsiteProduct {
  id?: string;
  categoryId?: string;
  categoryName?: string;
  categorySlug: string;
  name: string;
  slug: string;
  description?: string | null;
  shortDescription?: string | null;
  price: number;
  imageUrl?: string | null;
  isAvailable?: boolean;
  isVegetarian?: boolean;
  isBestseller?: boolean;
}

export interface LocalMenuItemDbRow {
  id: string;
  external_main_id: string | null;
  category_slug: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  image_url: string | null;
  is_vegetarian: boolean;
  is_bestseller: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
}

export interface MenuSyncLogDbRow {
  id: string;
  business_id: string;
  synced_by: string | null;
  synced_by_name: string | null;
  items_synced: number;
  source_url: string;
  status: string;
  created_at: Date;
}

export async function findActiveLocalMenuItems(): Promise<LocalMenuItemDbRow[]> {
  const { rows } = await query<LocalMenuItemDbRow>(
    `SELECT id, external_main_id, category_slug, name, slug, description,
            price::text AS price, image_url, is_vegetarian, is_bestseller,
            sort_order, is_active, created_at
     FROM menu_items
     WHERE is_active = true
     ORDER BY created_at ASC, id ASC`,
  );
  return rows;
}

export async function upsertMasterCategories(
  client: PoolClient,
  categories: Array<{ name: string; slug: string; sortOrder: number }>,
): Promise<void> {
  for (const cat of categories) {
    await client.query(
      `INSERT INTO menu_categories (name, slug, sort_order, is_active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (slug) DO UPDATE
       SET name = EXCLUDED.name,
           sort_order = EXCLUDED.sort_order,
           is_active = true`,
      [cat.name, cat.slug, cat.sortOrder],
    );
  }
}

export async function findMatchingLocalMenuItems(
  client: PoolClient,
  params: {
    externalMainId: string | null;
    slug: string;
    normalizedName: string;
  },
): Promise<LocalMenuItemDbRow[]> {
  const { rows } = await client.query<LocalMenuItemDbRow>(
    `SELECT id, external_main_id, category_slug, name, slug, description,
            price::text AS price, image_url, is_vegetarian, is_bestseller,
            sort_order, is_active, created_at
     FROM menu_items
     WHERE ($1::text IS NOT NULL AND external_main_id = $1)
        OR slug = $2
        OR LOWER(TRIM(name)) = $3
     ORDER BY created_at ASC, id ASC`,
    [params.externalMainId, params.slug, params.normalizedName],
  );
  return rows;
}

export async function mergeAndRemoveDuplicateMenuItem(
  client: PoolClient,
  survivorId: string,
  duplicateId: string,
): Promise<void> {
  // Preserve outlet overrides/availability from the duplicate before deleting it.
  await client.query(
    `INSERT INTO outlet_menu_items (outlet_id, menu_item_id, is_available, custom_price, updated_at)
     SELECT omi.outlet_id, $1, omi.is_available, omi.custom_price, omi.updated_at
     FROM outlet_menu_items omi
     WHERE omi.menu_item_id = $2
     ON CONFLICT (outlet_id, menu_item_id) DO UPDATE
     SET custom_price = COALESCE(outlet_menu_items.custom_price, EXCLUDED.custom_price),
         is_available = (outlet_menu_items.is_available AND EXCLUDED.is_available),
         updated_at = CURRENT_TIMESTAMP`,
    [survivorId, duplicateId],
  );

  await client.query('SAVEPOINT sp_merge_dup_item');
  try {
    await client.query('DELETE FROM menu_items WHERE id = $1', [duplicateId]);
    await client.query('RELEASE SAVEPOINT sp_merge_dup_item');
  } catch (err) {
    const pgCode = (err as { code?: string })?.code;
    if (pgCode === '23503') {
      await client.query('ROLLBACK TO SAVEPOINT sp_merge_dup_item');
      await client.query(
        `UPDATE menu_items
         SET is_active = false,
             slug = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [duplicateId, `archived-${duplicateId}`],
      );
      return;
    }
    throw err;
  }
}

export async function updateCanonicalMenuItem(
  client: PoolClient,
  id: string,
  item: MainWebsiteProduct,
  sortOrder: number,
): Promise<void> {
  const description = item.description ?? item.shortDescription ?? null;
  await client.query(
    `UPDATE menu_items
     SET external_main_id = $2,
         category_slug = $3,
         name = $4,
         slug = $5,
         description = $6,
         price = $7,
         image_url = $8,
         is_vegetarian = $9,
         is_bestseller = $10,
         sort_order = $11,
         is_active = true,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [
      id,
      item.id ?? null,
      item.categorySlug,
      item.name,
      item.slug,
      description,
      Number(item.price).toFixed(2),
      item.imageUrl ?? null,
      item.isVegetarian ?? true,
      item.isBestseller ?? false,
      sortOrder,
    ],
  );
}

export async function insertCanonicalMenuItem(
  client: PoolClient,
  item: MainWebsiteProduct,
  sortOrder: number,
): Promise<string> {
  const description = item.description ?? item.shortDescription ?? null;
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO menu_items (
       external_main_id, category_slug, name, slug, description,
       price, image_url, is_vegetarian, is_bestseller, sort_order, is_active, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, CURRENT_TIMESTAMP)
     RETURNING id`,
    [
      item.id ?? null,
      item.categorySlug,
      item.name,
      item.slug,
      description,
      Number(item.price).toFixed(2),
      item.imageUrl ?? null,
      item.isVegetarian ?? true,
      item.isBestseller ?? false,
      sortOrder,
    ],
  );
  return rows[0].id;
}

export async function ensureOutletMenuItemsForSyncedIds(
  client: PoolClient,
  syncedItemIds: string[],
): Promise<void> {
  if (syncedItemIds.length === 0) {
    return;
  }

  await client.query(
    `INSERT INTO outlet_menu_items (outlet_id, menu_item_id, is_available)
     SELECT o.id, mi.id, true
     FROM outlets o
     CROSS JOIN menu_items mi
     WHERE mi.id = ANY($1::uuid[])
     ON CONFLICT (outlet_id, menu_item_id) DO NOTHING`,
    [syncedItemIds],
  );
}

export async function removeStaleMenuItemsAndCategories(
  client: PoolClient,
  syncedItemIds: string[],
  upstreamCategorySlugs: string[],
): Promise<number> {
  const { rows: staleRows } = await client.query<{ id: string; is_active: boolean }>(
    `SELECT id, is_active
     FROM menu_items
     WHERE NOT (id = ANY($1::uuid[]))`,
    [syncedItemIds],
  );

  let removedCount = 0;
  for (const stale of staleRows) {
    await client.query('SAVEPOINT sp_delete_stale_item');
    try {
      await client.query('DELETE FROM menu_items WHERE id = $1', [stale.id]);
      await client.query('RELEASE SAVEPOINT sp_delete_stale_item');
      removedCount += 1;
    } catch (err) {
      const pgCode = (err as { code?: string })?.code;
      if (pgCode === '23503') {
        await client.query('ROLLBACK TO SAVEPOINT sp_delete_stale_item');
        if (stale.is_active) {
          await client.query(
            `UPDATE menu_items
             SET is_active = false, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [stale.id],
          );
          removedCount += 1;
        }
        continue;
      }
      throw err;
    }
  }

  // Delete unreferenced stale categories; deactivate any category kept by an FK-locked inactive item.
  await client.query(
    `DELETE FROM menu_categories
     WHERE NOT (slug = ANY($1::text[]))
       AND NOT EXISTS (
         SELECT 1 FROM menu_items mi WHERE mi.category_slug = menu_categories.slug
       )`,
    [upstreamCategorySlugs],
  );

  await client.query(
    `UPDATE menu_categories
     SET is_active = false
     WHERE NOT (slug = ANY($1::text[]))
       AND is_active = true`,
    [upstreamCategorySlugs],
  );

  return removedCount;
}

export async function insertMenuSyncLog(
  client: PoolClient,
  params: {
    businessId: string;
    syncedBy: string;
    itemsSynced: number;
    sourceUrl: string;
    status: 'SUCCESS' | 'FAILED';
  },
): Promise<{ created_at: Date }> {
  const { rows } = await client.query<{ created_at: Date }>(
    `INSERT INTO menu_sync_logs (business_id, synced_by, items_synced, source_url, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING created_at`,
    [
      params.businessId,
      params.syncedBy,
      params.itemsSynced,
      params.sourceUrl,
      params.status,
    ],
  );
  return rows[0];
}

export async function findMenuSyncLogs(limit: number = 50): Promise<MenuSyncLogDbRow[]> {
  const { rows } = await query<MenuSyncLogDbRow>(
    `SELECT l.id, l.business_id, l.synced_by, u.full_name AS synced_by_name,
            l.items_synced, l.source_url, l.status, l.created_at
     FROM menu_sync_logs l
     LEFT JOIN users u ON u.id = l.synced_by
     ORDER BY l.created_at DESC
     LIMIT $1`,
    [limit],
  );
  return rows;
}
