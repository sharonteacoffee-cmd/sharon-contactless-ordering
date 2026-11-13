import type { MenuCategoryRecord } from '@sharon/shared';
import { query, withTransaction } from '../../database/connection';
import type { CreateProductRequest, UpdateProductRequest } from './product.validator';

export interface ProductDbRow {
  id: string;
  external_main_id: string | null;
  category_slug: string;
  category_name?: string;
  name: string;
  slug: string;
  description: string | null;
  price: string | number;
  image_url: string | null;
  is_vegetarian: boolean;
  is_bestseller: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  linked_outlets_count?: string | number;
}

export async function findAllCategories(): Promise<MenuCategoryRecord[]> {
  const { rows } = await query<{
    id: string;
    name: string;
    slug: string;
    sort_order: number;
    is_active: boolean;
  }>(
    `SELECT id, name, slug, sort_order, is_active
     FROM menu_categories
     ORDER BY sort_order ASC, name ASC`,
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    sortOrder: r.sort_order,
    isActive: r.is_active,
  }));
}

export async function findAllProducts(filters?: {
  categorySlug?: string;
  search?: string;
}): Promise<ProductDbRow[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters?.categorySlug) {
    params.push(filters.categorySlug);
    conditions.push(`m.category_slug = $${params.length}`);
  }

  if (filters?.search) {
    params.push(`%${filters.search.trim().toLowerCase()}%`);
    conditions.push(`(LOWER(m.name) LIKE $${params.length} OR LOWER(m.slug) LIKE $${params.length})`);
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await query<ProductDbRow>(
    `SELECT m.id, m.external_main_id, m.category_slug, c.name AS category_name,
            m.name, m.slug, m.description, m.price, m.image_url,
            m.is_vegetarian, m.is_bestseller, m.sort_order, m.is_active,
            m.created_at, m.updated_at,
            COUNT(omi.id) AS linked_outlets_count
     FROM menu_items m
     LEFT JOIN menu_categories c ON c.slug = m.category_slug
     LEFT JOIN outlet_menu_items omi ON omi.menu_item_id = m.id AND omi.is_available = true
     ${whereSql}
     GROUP BY m.id, c.name
     ORDER BY m.sort_order ASC, m.name ASC`,
    params,
  );

  return rows;
}

export async function findProductById(productId: string): Promise<ProductDbRow | null> {
  const { rows } = await query<ProductDbRow>(
    `SELECT m.id, m.external_main_id, m.category_slug, c.name AS category_name,
            m.name, m.slug, m.description, m.price, m.image_url,
            m.is_vegetarian, m.is_bestseller, m.sort_order, m.is_active,
            m.created_at, m.updated_at
     FROM menu_items m
     LEFT JOIN menu_categories c ON c.slug = m.category_slug
     WHERE m.id = $1`,
    [productId],
  );
  return rows[0] ?? null;
}

export async function insertProductWithOutlets(
  input: CreateProductRequest,
): Promise<{ product: ProductDbRow; configuredOutlets: Array<{ id: string; slug: string }> }> {
  return withTransaction(async (client) => {
    // 1. Ensure category exists in menu_categories
    const categoryCheck = await client.query<{ id: string }>(
      'SELECT id FROM menu_categories WHERE slug = $1',
      [input.categorySlug],
    );
    if (categoryCheck.rows.length === 0) {
      const formattedCategoryName = input.categorySlug
        .split('-')
        .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');
      await client.query(
        `INSERT INTO menu_categories (name, slug, sort_order, is_active)
         VALUES ($1, $2, 99, true)
         ON CONFLICT (slug) DO NOTHING`,
        [formattedCategoryName, input.categorySlug],
      );
    }

    // 2. Compute safe unique slug for product
    let slug = (input.slug || input.name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!slug) slug = `prod-${Date.now()}`;

    const existingSlug = await client.query<{ id: string }>(
      'SELECT id FROM menu_items WHERE slug = $1',
      [slug],
    );
    if (existingSlug.rows.length > 0) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    // 3. Insert menu_item
    const { rows } = await client.query<ProductDbRow>(
      `INSERT INTO menu_items (
         category_slug, name, slug, description, price, image_url,
         is_vegetarian, is_bestseller, sort_order, is_active
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, external_main_id, category_slug, name, slug, description, price, image_url,
                 is_vegetarian, is_bestseller, sort_order, is_active, created_at, updated_at`,
      [
        input.categorySlug,
        input.name.trim(),
        slug,
        input.description?.trim() || null,
        input.price,
        input.imageUrl?.trim() || null,
        input.isVegetarian ?? true,
        input.isBestseller ?? false,
        input.sortOrder ?? 0,
        input.isActive ?? true,
      ],
    );
    const newProduct = rows[0];

    // 4. Configure outlet availability
    const configuredOutlets: Array<{ id: string; slug: string }> = [];
    const outletIds = (input.outletBusinessIds ?? []).filter((x: string) => x && x !== 'ALL');

    if (outletIds.length > 0) {
      // Specific outlets selected: configure only those outlets as available
      const outletsRes = await client.query<{ id: string; slug: string }>(
        'SELECT id, slug FROM outlets WHERE business_id = ANY($1)',
        [outletIds],
      );
      for (const row of outletsRes.rows) {
        await client.query(
          `INSERT INTO outlet_menu_items (outlet_id, menu_item_id, is_available, custom_price)
           VALUES ($1, $2, true, $3)
           ON CONFLICT (outlet_id, menu_item_id) DO UPDATE
           SET is_available = true,
               custom_price = EXCLUDED.custom_price,
               updated_at = CURRENT_TIMESTAMP`,
          [row.id, newProduct.id, input.customPrice || null],
        );
        configuredOutlets.push({ id: row.id, slug: row.slug });
      }
    } else {
      // All active outlets: link to every active outlet
      const allOutlets = await client.query<{ id: string; slug: string }>(
        'SELECT id, slug FROM outlets WHERE is_active = true',
      );
      for (const row of allOutlets.rows) {
        await client.query(
          `INSERT INTO outlet_menu_items (outlet_id, menu_item_id, is_available, custom_price)
           VALUES ($1, $2, true, $3)
           ON CONFLICT (outlet_id, menu_item_id) DO UPDATE
           SET is_available = true,
               custom_price = EXCLUDED.custom_price,
               updated_at = CURRENT_TIMESTAMP`,
          [row.id, newProduct.id, input.customPrice || null],
        );
        configuredOutlets.push({ id: row.id, slug: row.slug });
      }
    }

    return { product: newProduct, configuredOutlets };
  });
}

export async function updateProductWithOutlets(
  productId: string,
  input: UpdateProductRequest,
): Promise<{ product: ProductDbRow; configuredOutlets: Array<{ id: string; slug: string }> }> {
  return withTransaction(async (client) => {
    const fieldMappings: Array<[keyof UpdateProductRequest, string]> = [
      ['name', 'name'],
      ['slug', 'slug'],
      ['categorySlug', 'category_slug'],
      ['description', 'description'],
      ['price', 'price'],
      ['imageUrl', 'image_url'],
      ['isVegetarian', 'is_vegetarian'],
      ['isBestseller', 'is_bestseller'],
      ['sortOrder', 'sort_order'],
      ['isActive', 'is_active'],
    ];

    const setClauses: string[] = [];
    const params: unknown[] = [];

    for (const [key, column] of fieldMappings) {
      const val = input[key];
      if (val !== undefined) {
        params.push(val);
        setClauses.push(`${column} = $${params.length}`);
      }
    }

    let updatedProduct: ProductDbRow;

    if (setClauses.length > 0) {
      params.push(productId);
      const { rows } = await client.query<ProductDbRow>(
        `UPDATE menu_items
         SET ${setClauses.join(', ')},
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $${params.length}
         RETURNING id, external_main_id, category_slug, name, slug, description, price, image_url,
                   is_vegetarian, is_bestseller, sort_order, is_active, created_at, updated_at`,
        params,
      );
      if (rows.length === 0) {
        throw new Error('Product not found');
      }
      updatedProduct = rows[0];
    } else {
      const existing = await client.query<ProductDbRow>(
        'SELECT * FROM menu_items WHERE id = $1',
        [productId],
      );
      if (existing.rows.length === 0) {
        throw new Error('Product not found');
      }
      updatedProduct = existing.rows[0];
    }

    // Configure outlet availability if supplied
    const configuredOutlets: Array<{ id: string; slug: string }> = [];
    if (input.outletBusinessIds !== undefined) {
      const outletIds = input.outletBusinessIds.filter((x: string) => x && x !== 'ALL');
      if (outletIds.length > 0) {
        const outletsRes = await client.query<{ id: string; slug: string }>(
          'SELECT id, slug FROM outlets WHERE business_id = ANY($1)',
          [outletIds],
        );
        for (const row of outletsRes.rows) {
          await client.query(
            `INSERT INTO outlet_menu_items (outlet_id, menu_item_id, is_available, custom_price)
             VALUES ($1, $2, true, $3)
             ON CONFLICT (outlet_id, menu_item_id) DO UPDATE
             SET is_available = true,
                 custom_price = COALESCE($3, outlet_menu_items.custom_price),
                 updated_at = CURRENT_TIMESTAMP`,
            [row.id, productId, input.customPrice || null],
          );
          configuredOutlets.push({ id: row.id, slug: row.slug });
        }
      }
    }

    return { product: updatedProduct, configuredOutlets };
  });
}

export async function deleteOrDeactivateProductRow(
  productId: string,
): Promise<{ deleted: boolean; deactivated: boolean }> {
  return withTransaction(async (client) => {
    // Check if order items reference this menu item
    const orderItemsCheck = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM orders, jsonb_array_elements(items) AS item
       WHERE item->>'menuItemId' = $1`,
      [productId],
    );

    if (parseInt(orderItemsCheck.rows[0]?.count || '0', 10) > 0) {
      // Historical orders reference this item: deactivate safely
      await client.query(
        `UPDATE menu_items
         SET is_active = false,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [productId],
      );
      await client.query(
        `UPDATE outlet_menu_items
         SET is_available = false,
             updated_at = CURRENT_TIMESTAMP
         WHERE menu_item_id = $1`,
        [productId],
      );
      return { deleted: false, deactivated: true };
    }

    // No historical orders: delete from outlet_menu_items and menu_items
    await client.query('DELETE FROM outlet_menu_items WHERE menu_item_id = $1', [productId]);
    await client.query('DELETE FROM menu_items WHERE id = $1', [productId]);
    return { deleted: true, deactivated: false };
  });
}
