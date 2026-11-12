import { z } from 'zod';
import { toggleStockSchema } from '@sharon/shared';

export const toggleStockParamsSchema = z.object({
  outletBusinessId: z.string().trim().min(1).max(50),
  menuItemId: z.string().uuid('Invalid menu item ID'),
});

export const getOutletStockParamsSchema = z.object({
  outletBusinessId: z.string().trim().min(1).max(50),
});

export { toggleStockSchema };
