import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../../middleware/validate.middleware';
import {
  handleGetPublicOutletBySlug,
  handleGetPublicOutlets,
} from './publicOutlet.controller';

const outletSlugParamsSchema = z.object({
  outletSlug: z.string().trim().min(1).max(255),
});

export const publicOutletRouter: Router = Router();

publicOutletRouter.get('/GetPublicOutlets', handleGetPublicOutlets);
publicOutletRouter.get(
  '/GetPublicOutletBySlug/:outletSlug',
  validateRequest({ params: outletSlugParamsSchema }),
  handleGetPublicOutletBySlug,
);
