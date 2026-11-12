import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../../middleware/validate.middleware';
import { handleGetPublicMenu } from './publicMenu.controller';

const menuParamsSchema = z.object({
  outletSlug: z.string().trim().min(1).max(255),
});

export const publicMenuRouter: Router = Router();

publicMenuRouter.get(
  '/GetPublicMenu/:outletSlug',
  validateRequest({ params: menuParamsSchema }),
  handleGetPublicMenu,
);
