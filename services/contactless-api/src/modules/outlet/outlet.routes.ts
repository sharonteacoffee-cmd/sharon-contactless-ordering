import { Router } from 'express';
import { authenticateMiddleware } from '../../middleware/authenticate.middleware';
import { authorizeRoles } from '../../middleware/authorize.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import {
  handleCreateOutlet,
  handleDeleteOutlet,
  handleGetOutlets,
  handleUpdateOutlet,
  handleUpdateOutletSettings,
} from './outlet.controller';
import {
  createOutletSchema,
  outletBusinessIdParamsSchema,
  updateOutletFullSchema,
  updateOutletSettingsSchema,
} from './outlet.validator';

export const outletRouter: Router = Router();

outletRouter.use(authenticateMiddleware, authorizeRoles('MD'));

outletRouter.get('/GetOutlets', handleGetOutlets);

outletRouter.post(
  '/CreateOutlet',
  validateRequest({
    body: createOutletSchema,
  }),
  handleCreateOutlet,
);

outletRouter.put(
  '/UpdateOutlet/:outletBusinessId',
  validateRequest({
    params: outletBusinessIdParamsSchema,
    body: updateOutletFullSchema,
  }),
  handleUpdateOutlet,
);

outletRouter.put(
  '/UpdateOutletSettings/:outletBusinessId',
  validateRequest({
    params: outletBusinessIdParamsSchema,
    body: updateOutletSettingsSchema,
  }),
  handleUpdateOutletSettings,
);

outletRouter.delete(
  '/DeleteOutlet/:outletBusinessId',
  validateRequest({
    params: outletBusinessIdParamsSchema,
  }),
  handleDeleteOutlet,
);
