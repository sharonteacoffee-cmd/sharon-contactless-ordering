import { Router } from 'express';
import { authenticateMiddleware } from '../../middleware/authenticate.middleware';
import { authorizeRoles } from '../../middleware/authorize.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import {
  handleGetOutletStock,
  handleToggleOutletStock,
} from './outletStock.controller';
import {
  getOutletStockParamsSchema,
  toggleStockParamsSchema,
  toggleStockSchema,
} from './outletStock.validator';

export const outletStockRouter: Router = Router();

outletStockRouter.use(authenticateMiddleware, authorizeRoles('MD', 'OUTLET_STAFF'));

outletStockRouter.get(
  '/GetOutletStock/:outletBusinessId',
  validateRequest({ params: getOutletStockParamsSchema }),
  handleGetOutletStock,
);

outletStockRouter.patch(
  '/ToggleItemAvailability/:outletBusinessId/:menuItemId',
  validateRequest({
    params: toggleStockParamsSchema,
    body: toggleStockSchema,
  }),
  handleToggleOutletStock,
);
