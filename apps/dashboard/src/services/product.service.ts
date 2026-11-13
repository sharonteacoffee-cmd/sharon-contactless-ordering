import type {
  ApiSuccessEnvelope,
  CreateProductInput,
  MasterMenuItemRecord,
  MenuCategoryRecord,
  UpdateProductInput,
} from '@sharon/shared';
import { axiosClient } from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/endpoints';

export interface CreateProductPayload extends CreateProductInput {
  outletBusinessIds?: string[];
  customPrice?: number | null;
}

export interface UpdateProductPayload extends UpdateProductInput {
  outletBusinessIds?: string[];
  customPrice?: number | null;
}

export async function getCategories(): Promise<MenuCategoryRecord[]> {
  const { data } = await axiosClient.get<
    ApiSuccessEnvelope<MenuCategoryRecord[]>
  >(API_ENDPOINTS.PRODUCT.GET_CATEGORIES);
  return data.data;
}

export async function getProducts(params?: {
  categorySlug?: string;
  search?: string;
}): Promise<MasterMenuItemRecord[]> {
  const { data } = await axiosClient.get<
    ApiSuccessEnvelope<MasterMenuItemRecord[]>
  >(API_ENDPOINTS.PRODUCT.GET_PRODUCTS, { params });
  return data.data;
}

export async function createProduct(
  payload: CreateProductPayload,
): Promise<MasterMenuItemRecord> {
  const { data } = await axiosClient.post<
    ApiSuccessEnvelope<MasterMenuItemRecord>
  >(API_ENDPOINTS.PRODUCT.CREATE_PRODUCT, payload);
  return data.data;
}

export async function updateProduct(
  productId: string,
  payload: UpdateProductPayload,
): Promise<MasterMenuItemRecord> {
  const { data } = await axiosClient.put<
    ApiSuccessEnvelope<MasterMenuItemRecord>
  >(API_ENDPOINTS.PRODUCT.UPDATE_PRODUCT(productId), payload);
  return data.data;
}

export async function deleteProduct(
  productId: string,
): Promise<{ productId: string; deleted: boolean; deactivated: boolean }> {
  const { data } = await axiosClient.delete<
    ApiSuccessEnvelope<{ productId: string; deleted: boolean; deactivated: boolean }>
  >(API_ENDPOINTS.PRODUCT.DELETE_PRODUCT(productId));
  return data.data;
}
