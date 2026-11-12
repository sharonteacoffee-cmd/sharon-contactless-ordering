import { Router } from 'express';
import {
  createPublicOrderRateLimiter,
  demoPaymentRateLimiter,
} from '../../middleware/rateLimiter.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import {
  handleCreatePublicOrder,
  handleGetPublicOrderById,
  handleSubmitDemoPayment,
} from './publicOrder.controller';
import {
  createPublicOrderSchema,
  orderBusinessIdParamsSchema,
  submitDemoPaymentSchema,
} from './publicOrder.validator';

export const publicOrderRouter: Router = Router();

publicOrderRouter.post(
  '/CreatePublicOrder',
  createPublicOrderRateLimiter,
  validateRequest({ body: createPublicOrderSchema }),
  handleCreatePublicOrder,
);

publicOrderRouter.post(
  '/SubmitDemoPayment/:orderBusinessId',
  demoPaymentRateLimiter,
  validateRequest({
    params: orderBusinessIdParamsSchema,
    body: submitDemoPaymentSchema,
  }),
  handleSubmitDemoPayment,
);

publicOrderRouter.get(
  '/GetPublicOrderById/:orderBusinessId',
  validateRequest({ params: orderBusinessIdParamsSchema }),
  handleGetPublicOrderById,
);
