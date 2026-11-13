import { z } from 'zod';
import { createProductSchema, updateProductSchema } from '@sharon/shared';

export const productIdParamsSchema = z.object({
  productId: z.string().uuid('Invalid product ID format'),
});

export const createProductRequestSchema = createProductSchema.extend({
  outletBusinessIds: z.array(z.string().trim()).optional().default([]),
  customPrice: z
    .number()
    .nonnegative('Custom price cannot be negative')
    .max(100000)
    .nullable()
    .optional(),
});

export const updateProductRequestSchema = updateProductSchema.extend({
  outletBusinessIds: z.array(z.string().trim()).optional(),
  customPrice: z
    .number()
    .nonnegative('Custom price cannot be negative')
    .max(100000)
    .nullable()
    .optional(),
});

export type CreateProductRequest = z.infer<typeof createProductRequestSchema>;
export type UpdateProductRequest = z.infer<typeof updateProductRequestSchema>;
