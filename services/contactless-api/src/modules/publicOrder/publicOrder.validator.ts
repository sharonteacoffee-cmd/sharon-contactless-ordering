import { z } from 'zod';
import {
  createPublicOrderSchema,
  submitDemoPaymentSchema,
} from '@sharon/shared';

export const orderBusinessIdParamsSchema = z.object({
  orderBusinessId: z
    .string()
    .trim()
    .regex(/^ORD[A-Z0-9]+$/i, 'Invalid order business ID format'),
});

export { createPublicOrderSchema, submitDemoPaymentSchema };
