import { z } from 'zod';
import { updateOutletSettingsSchema } from '@sharon/shared';

export const outletBusinessIdParamsSchema = z.object({
  outletBusinessId: z
    .string()
    .trim()
    .regex(/^OUT[A-Z0-9]+$/i, 'Invalid outlet business ID format'),
});

export { updateOutletSettingsSchema };
