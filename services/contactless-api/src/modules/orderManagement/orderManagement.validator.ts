import { z } from 'zod';
import {
  orderStatusSchema,
  paymentStatusSchema,
  updateOrderStatusSchema,
  verifyPaymentSchema,
} from '@sharon/shared';

export const orderBusinessIdParamsSchema = z.object({
  orderBusinessId: z
    .string()
    .trim()
    .regex(/^ORD[A-Z0-9]+$/i, 'Invalid order business ID format'),
});

export const liveOrdersQuerySchema = z.object({
  outletBusinessId: z.string().trim().min(1).max(50).optional(),
});

export const orderHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  outletBusinessId: z.string().trim().min(1).max(50).optional(),
  orderStatus: orderStatusSchema.optional(),
  paymentStatus: paymentStatusSchema.optional(),
  search: z.string().trim().max(100).optional(),
  fromUtc: z.string().datetime().optional(),
  toUtc: z.string().datetime().optional(),
});

export { updateOrderStatusSchema, verifyPaymentSchema };
