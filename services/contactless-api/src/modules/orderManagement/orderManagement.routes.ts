import { Router } from 'express';
import { authenticateMiddleware } from '../../middleware/authenticate.middleware';
import { authorizeRoles } from '../../middleware/authorize.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import {
  handleGetLiveOrders,
  handleGetOrderHistory,
  handleUpdateOrderStatus,
  handleVerifyOrderPayment,
} from './orderManagement.controller';
import {
  liveOrdersQuerySchema,
  orderBusinessIdParamsSchema,
  orderHistoryQuerySchema,
  updateOrderStatusSchema,
  verifyPaymentSchema,
} from './orderManagement.validator';

export const orderManagementRouter: Router = Router();

orderManagementRouter.use(authenticateMiddleware, authorizeRoles('MD', 'OUTLET_STAFF'));

orderManagementRouter.get(
  '/GetLiveOrders',
  validateRequest({ query: liveOrdersQuerySchema }),
  handleGetLiveOrders,
);

orderManagementRouter.get(
  '/GetOrderHistory',
  validateRequest({ query: orderHistoryQuerySchema }),
  handleGetOrderHistory,
);

orderManagementRouter.patch(
  '/UpdateOrderStatus/:orderBusinessId',
  validateRequest({
    params: orderBusinessIdParamsSchema,
    body: updateOrderStatusSchema,
  }),
  handleUpdateOrderStatus,
);

orderManagementRouter.patch(
  '/VerifyOrderPayment/:orderBusinessId',
  validateRequest({
    params: orderBusinessIdParamsSchema,
    body: verifyPaymentSchema,
  }),
  handleVerifyOrderPayment,
);
