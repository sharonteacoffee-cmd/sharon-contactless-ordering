import { z } from 'zod';
import { generateQrSchema, updateQrStatusSchema } from '@sharon/shared';

export const qrBusinessIdParamsSchema = z.object({
  qrBusinessId: z
    .string()
    .trim()
    .regex(/^QR[A-Z0-9]+$/i, 'Invalid QR business ID format'),
});

export const getQrCodesQuerySchema = z.object({
  outletBusinessId: z.string().trim().min(1).max(50).optional(),
});

export { generateQrSchema, updateQrStatusSchema };
