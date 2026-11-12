import { z } from 'zod';
import {
  createUserSchema,
  toggleUserStatusSchema,
  updateUserSchema,
} from '@sharon/shared';

export const userBusinessIdParamsSchema = z.object({
  userBusinessId: z
    .string()
    .trim()
    .regex(/^USR[A-Z0-9]+$/i, 'Invalid user business ID format'),
});

export { createUserSchema, updateUserSchema, toggleUserStatusSchema };
