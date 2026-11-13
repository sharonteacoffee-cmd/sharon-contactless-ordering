import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardQueryKeys } from '../api/queryKeys';
import {
  createProduct,
  deleteProduct,
  getCategories,
  getProducts,
  updateProduct,
  type CreateProductPayload,
  type UpdateProductPayload,
} from '../services/product.service';

export function useCategoriesQuery() {
  return useQuery({
    queryKey: dashboardQueryKeys.products.categories,
    queryFn: getCategories,
    staleTime: 5 * 60 * 1000,
  });
}

export function useProductsQuery(filters?: {
  categorySlug?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: dashboardQueryKeys.products.list(filters),
    queryFn: () => getProducts(filters),
    staleTime: 60 * 1000,
  });
}

export function useCreateProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateProductPayload) => createProduct(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.products.all,
      });
      void queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.stock.all,
      });
    },
  });
}

export function useUpdateProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      payload,
    }: {
      productId: string;
      payload: UpdateProductPayload;
    }) => updateProduct(productId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.products.all,
      });
      void queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.stock.all,
      });
    },
  });
}

export function useDeleteProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => deleteProduct(productId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.products.all,
      });
      void queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.stock.all,
      });
    },
  });
}
