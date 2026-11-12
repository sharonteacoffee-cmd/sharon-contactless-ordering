import {
  toUTCISOString,
  type MenuSyncMode,
  type MenuSyncPreviewChange,
  type MenuSyncPreviewResult,
  type MenuSyncPreviewStaleItem,
  type MenuSyncResult,
} from '@sharon/shared';
import { z } from 'zod';
import { integrationConfig } from '../../config/integration.config';
import { generateNextBusinessId } from '../../database/businessIdGenerator';
import { withTransaction } from '../../database/connection';
import { AppError } from '../../utils/appError';
import {
  ensureOutletMenuItemsForSyncedIds,
  findActiveLocalMenuItems,
  findMatchingLocalMenuItems,
  findMenuSyncLogs,
  insertCanonicalMenuItem,
  insertMenuSyncLog,
  mergeAndRemoveDuplicateMenuItem,
  removeStaleMenuItemsAndCategories,
  updateCanonicalMenuItem,
  upsertMasterCategories,
  type LocalMenuItemDbRow,
  type MainWebsiteProduct,
} from './menuSync.repository';

const externalProductSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().optional(),
  categoryName: z.string().optional(),
  categorySlug: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable().optional(),
  shortDescription: z.string().nullable().optional(),
  price: z.coerce.number().nonnegative(),
  imageUrl: z.string().nullable().optional(),
  isAvailable: z.boolean().optional(),
  isVegetarian: z.boolean().optional(),
  isBestseller: z.boolean().optional(),
});

function normalizeMenuName(value: string): string {
  return value.trim().toLowerCase();
}

function extractProductsArray(rawPayload: unknown): MainWebsiteProduct[] {
  let candidate: unknown = rawPayload;
  if (rawPayload && typeof rawPayload === 'object' && !Array.isArray(rawPayload)) {
    const record = rawPayload as Record<string, unknown>;
    candidate = record.data ?? record.products ?? record.items ?? [];
  }

  const parsed = z.array(externalProductSchema).safeParse(candidate);
  if (!parsed.success) {
    throw new AppError(
      502,
      'UPSTREAM_MENU_INVALID',
      'Received an unexpected menu payload from main website API.',
    );
  }
  return parsed.data;
}

function deduplicateUpstreamProducts(rawProducts: MainWebsiteProduct[]): MainWebsiteProduct[] {
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const seenNames = new Set<string>();
  const deduped: MainWebsiteProduct[] = [];

  for (const product of rawProducts) {
    const cleanId = product.id?.trim() || undefined;
    const cleanSlug = product.slug.trim();
    const cleanName = product.name.trim();
    const cleanCategorySlug = product.categorySlug.trim();
    const normalizedName = normalizeMenuName(cleanName);

    if (
      (cleanId && seenIds.has(cleanId)) ||
      seenSlugs.has(cleanSlug) ||
      seenNames.has(normalizedName)
    ) {
      continue;
    }

    if (cleanId) {
      seenIds.add(cleanId);
    }
    seenSlugs.add(cleanSlug);
    seenNames.add(normalizedName);

    deduped.push({
      ...product,
      id: cleanId,
      slug: cleanSlug,
      name: cleanName,
      categorySlug: cleanCategorySlug,
      imageUrl: product.imageUrl?.trim() ? product.imageUrl.trim() : null,
    });
  }

  return deduped;
}

function deriveCategoriesFromProducts(
  products: MainWebsiteProduct[],
): Array<{ name: string; slug: string; sortOrder: number }> {
  const categoryMap = new Map<string, { name: string; slug: string; sortOrder: number }>();
  for (const product of products) {
    if (!categoryMap.has(product.categorySlug)) {
      categoryMap.set(product.categorySlug, {
        name: product.categoryName?.trim() || product.categorySlug,
        slug: product.categorySlug,
        sortOrder: categoryMap.size + 1,
      });
    }
  }
  return Array.from(categoryMap.values());
}

async function fetchUpstreamCatalog(): Promise<{
  sourceUrl: string;
  products: MainWebsiteProduct[];
  categories: Array<{ name: string; slug: string; sortOrder: number }>;
}> {
  const sourceUrl = integrationConfig.mainWebsiteApiUrl;

  let response: Response;
  try {
    response = await fetch(sourceUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new AppError(
      503,
      'UPSTREAM_MENU_UNREACHABLE',
      'Unable to reach main website menu API. Please retry shortly.',
    );
  }

  if (!response.ok) {
    throw new AppError(
      502,
      'UPSTREAM_MENU_ERROR',
      `Main website menu API returned HTTP ${response.status}.`,
    );
  }

  const rawJson = (await response.json()) as unknown;
  const products = deduplicateUpstreamProducts(extractProductsArray(rawJson));
  const categories = deriveCategoriesFromProducts(products);

  return { sourceUrl, products, categories };
}

function pickCanonicalMenuItemRow(
  matches: LocalMenuItemDbRow[],
  upstreamItem: MainWebsiteProduct,
): LocalMenuItemDbRow {
  const sorted = [...matches].sort((a, b) => {
    const score = (row: LocalMenuItemDbRow): number => {
      let s = 0;
      if (upstreamItem.id && row.external_main_id === upstreamItem.id) s += 100;
      if (row.slug === upstreamItem.slug) s += 50;
      if (row.is_active) s += 10;
      return s;
    };

    const diff = score(b) - score(a);
    if (diff !== 0) return diff;
    const timeDiff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.id.localeCompare(b.id);
  });

  return sorted[0];
}

export async function previewMenuSyncFromWebsite(): Promise<MenuSyncPreviewResult> {
  const [{ sourceUrl, products, categories }, localItems] = await Promise.all([
    fetchUpstreamCatalog(),
    findActiveLocalMenuItems(),
  ]);

  const matchedLocalIds = new Set<string>();
  const changedItems: MenuSyncPreviewChange[] = [];
  let matchedCount = 0;
  let newCount = 0;
  let duplicateCount = 0;

  for (const upstream of products) {
    const normalizedUpstreamName = normalizeMenuName(upstream.name);
    const matches = localItems.filter((local) => {
      if (matchedLocalIds.has(local.id)) return false;
      return (
        (upstream.id ? local.external_main_id === upstream.id : false) ||
        local.slug === upstream.slug ||
        normalizeMenuName(local.name) === normalizedUpstreamName
      );
    });

    if (matches.length === 0) {
      newCount += 1;
      continue;
    }

    const primary = pickCanonicalMenuItemRow(matches, upstream);
    for (const m of matches) {
      matchedLocalIds.add(m.id);
    }

    matchedCount += 1;
    if (matches.length > 1) {
      duplicateCount += matches.length - 1;
    }

    const localPrice = Number(primary.price);
    const upstreamPrice = Number(upstream.price);
    const priceChanged = Math.abs(localPrice - upstreamPrice) > 0.009;
    const nameChanged = primary.name.trim() !== upstream.name.trim();
    const slugChanged = primary.slug !== upstream.slug;
    const categoryChanged = primary.category_slug !== upstream.categorySlug;
    const imageChanged = (primary.image_url ?? null) !== (upstream.imageUrl ?? null);

    if (priceChanged || nameChanged || slugChanged || categoryChanged || imageChanged) {
      changedItems.push({
        localName: primary.name,
        upstreamName: upstream.name,
        localSlug: primary.slug,
        upstreamSlug: upstream.slug,
        localPrice,
        upstreamPrice,
        imageChanged,
        categorySlug: upstream.categorySlug,
      });
    }
  }

  const staleRows = localItems.filter((local) => !matchedLocalIds.has(local.id));
  const seenUnmatchedNames = new Set<string>();
  for (const stale of staleRows) {
    const normalized = normalizeMenuName(stale.name);
    if (seenUnmatchedNames.has(normalized)) {
      duplicateCount += 1;
    } else {
      seenUnmatchedNames.add(normalized);
    }
  }

  const staleItems: MenuSyncPreviewStaleItem[] = staleRows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    categorySlug: row.category_slug,
    price: Number(row.price),
    imageUrl: row.image_url,
  }));

  return {
    sourceUrl,
    upstreamCount: products.length,
    categoriesCount: categories.length,
    localTotalCount: localItems.length,
    matchedCount,
    newCount,
    mismatchCount: changedItems.length,
    staleCount: staleItems.length,
    duplicateCount,
    changedItems,
    staleItems,
    checkedAt: toUTCISOString(new Date()),
  };
}

export async function syncMenuFromWebsite(
  syncedByUserId: string,
  syncMode: MenuSyncMode = 'REPLACE_ALL',
): Promise<MenuSyncResult> {
  const { sourceUrl, products, categories } = await fetchUpstreamCatalog();

  const result = await withTransaction(async (client) => {
    await upsertMasterCategories(client, categories);

    const syncedItemIds: string[] = [];
    const syncedIdSet = new Set<string>();
    let insertedCount = 0;
    let updatedCount = 0;
    let deduplicatedCount = 0;

    for (let i = 0; i < products.length; i += 1) {
      const item = products[i];
      const sortOrder = i + 1;

      const rawMatches = await findMatchingLocalMenuItems(client, {
        externalMainId: item.id ?? null,
        slug: item.slug,
        normalizedName: normalizeMenuName(item.name),
      });
      const matches = rawMatches.filter((m) => !syncedIdSet.has(m.id));

      if (matches.length === 0) {
        const insertedId = await insertCanonicalMenuItem(client, item, sortOrder);
        syncedItemIds.push(insertedId);
        syncedIdSet.add(insertedId);
        insertedCount += 1;
        continue;
      }

      const survivor = pickCanonicalMenuItemRow(matches, item);
      for (const candidate of matches) {
        if (candidate.id !== survivor.id) {
          await mergeAndRemoveDuplicateMenuItem(client, survivor.id, candidate.id);
          deduplicatedCount += 1;
        }
      }

      await updateCanonicalMenuItem(client, survivor.id, item, sortOrder);
      syncedItemIds.push(survivor.id);
      syncedIdSet.add(survivor.id);
      updatedCount += 1;
    }

    await ensureOutletMenuItemsForSyncedIds(client, syncedItemIds);

    const deletedCount =
      syncMode === 'REPLACE_ALL'
        ? await removeStaleMenuItemsAndCategories(
            client,
            syncedItemIds,
            categories.map((cat) => cat.slug),
          )
        : 0;

    const syncBusinessId = await generateNextBusinessId(client, 'SYNC');
    const logRow = await insertMenuSyncLog(client, {
      businessId: syncBusinessId,
      syncedBy: syncedByUserId,
      itemsSynced: syncedItemIds.length,
      sourceUrl,
      status: 'SUCCESS',
    });

    return {
      syncBusinessId,
      syncMode,
      itemsSynced: syncedItemIds.length,
      categoriesSynced: categories.length,
      insertedCount,
      updatedCount,
      deletedCount,
      deduplicatedCount,
      sourceUrl,
      status: 'SUCCESS' as const,
      syncedAt: toUTCISOString(logRow.created_at),
    };
  });

  return result;
}

export async function getMenuSyncLogs(): Promise<
  Array<{
    businessId: string;
    syncedByName: string | null;
    itemsSynced: number;
    sourceUrl: string;
    status: string;
    createdAt: string;
  }>
> {
  const rows = await findMenuSyncLogs();
  return rows.map((row) => ({
    businessId: row.business_id,
    syncedByName: row.synced_by_name,
    itemsSynced: row.items_synced,
    sourceUrl: row.source_url,
    status: row.status,
    createdAt: toUTCISOString(row.created_at),
  }));
}
