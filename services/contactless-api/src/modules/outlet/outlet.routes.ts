import { Router } from 'express';
import { authenticateMiddleware } from '../../middleware/authenticate.middleware';
import { authorizeRoles } from '../../middleware/authorize.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import {
  handleGetOutlets,
  handleUpdateOutletSettings,
} from './outlet.controller';
import {
  outletBusinessIdParamsSchema,
  updateOutletSettingsSchema,
} from './outlet.validator';

export const outletRouter: Router = Router();

outletRouter.use(authenticateMiddleware, authorizeRoles('MD'));

outletRouter.get('/GetOutlets', handleGetOutlets);

outletRouter.put(
  '/UpdateOutletSettings/:outletBusinessId',
  validateRequest({
    params: outletBusinessIdParamsSchema,
    body: updateOutletSettingsSchema,
  }),
  handleUpdateOutletSettings,
);
