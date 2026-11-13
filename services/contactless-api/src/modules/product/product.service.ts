import {
  toUTCISOString,
  type MasterMenuItemRecord,
  type MenuCategoryRecord,
} from '@sharon/shared';
import { emitOutletStockChanged } from '../../socket/socketBroadcaster';
import { AppError } from '../../utils/appError';
import {
  deleteOrDeactivateProductRow,
  findAllCategories,
  findAllProducts,
  findProductById,
  insertProductWithOutlets,
  updateProductWithOutlets,
  type ProductDbRow,
} from './product.repository';
import type { CreateProductRequest, UpdateProductRequest } from './product.validator';

function toProductRecord(row: ProductDbRow): MasterMenuItemRecord {
  return {
    id: row.id,
    externalMainId: row.external_main_id,
    categorySlug: row.category_slug,
    categoryName: row.category_name,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: typeof row.price === 'string' ? parseFloat(row.price) : row.price,
    imageUrl: row.image_url,
    isVegetarian: row.is_vegetarian,
    isBestseller: row.is_bestseller,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: toUTCISOString(row.created_at),
    updatedAt: toUTCISOString(row.updated_at),
  };
}

export async function getCategories(): Promise<MenuCategoryRecord[]> {
  return findAllCategories();
}

export async function getProducts(filters?: {
  categorySlug?: string;
  search?: string;
}): Promise<MasterMenuItemRecord[]> {
  const rows = await findAllProducts(filters);
  return rows.map(toProductRecord);
}

export async function createProduct(
  input: CreateProductRequest,
): Promise<MasterMenuItemRecord> {
  const { product, configuredOutlets } = await insertProductWithOutlets(input);
  const record = toProductRecord(product);

  for (const outlet of configuredOutlets) {
    emitOutletStockChanged({
      outletId: outlet.id,
      outletSlug: outlet.slug,
      menuItemId: record.id,
      isAvailable: true,
      customPrice: input.customPrice ?? null,
      updatedAt: record.updatedAt,
    });
  }

  return record;
}

export async function updateProduct(
  productId: string,
  input: UpdateProductRequest,
): Promise<MasterMenuItemRecord> {
  const existing = await findProductById(productId);
  if (!existing) {
    throw new AppError(404, 'PRODUCT_NOT_FOUND', `Product ${productId} not found`);
  }

  const { product, configuredOutlets } = await updateProductWithOutlets(
    productId,
    input,
  );
  const record = toProductRecord(product);

  for (const outlet of configuredOutlets) {
    emitOutletStockChanged({
      outletId: outlet.id,
      outletSlug: outlet.slug,
      menuItemId: record.id,
      isAvailable: record.isActive,
      customPrice: input.customPrice ?? null,
      updatedAt: record.updatedAt,
    });
  }

  return record;
}

export async function deleteProduct(
  productId: string,
): Promise<{ productId: string; deleted: boolean; deactivated: boolean }> {
  const existing = await findProductById(productId);
  if (!existing) {
    throw new AppError(404, 'PRODUCT_NOT_FOUND', `Product ${productId} not found`);
  }

  const res = await deleteOrDeactivateProductRow(productId);
  return {
    productId,
    deleted: res.deleted,
    deactivated: res.deactivated,
  };
}
