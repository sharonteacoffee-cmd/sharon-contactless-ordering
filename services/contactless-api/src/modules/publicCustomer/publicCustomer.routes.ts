import { Router } from 'express';
import { authenticateCustomerMiddleware } from '../../middleware/authenticateCustomer.middleware';
import {
  customerLookupRateLimiter,
  customerOtpRateLimiter,
  customerProfileRateLimiter,
} from '../../middleware/rateLimiter.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import {
  handleGetMyCustomerOrders,
  handleGetMyCustomerProfile,
  handleLookupCustomerByPhone,
  handleSaveCustomerProfile,
  handleSendCustomerLoginOtp,
  handleUpdateMyCustomerProfile,
  handleVerifyCustomerLoginOtp,
} from './publicCustomer.controller';
import {
  lookupCustomerByPhoneSchema,
  saveCustomerProfileSchema,
  sendCustomerLoginOtpSchema,
  updateCustomerProfileSchema,
  verifyCustomerLoginOtpSchema,
} from './publicCustomer.validator';

export const publicCustomerRouter: Router = Router();

publicCustomerRouter.get(
  '/LookupByPhone',
  customerLookupRateLimiter,
  validateRequest({ query: lookupCustomerByPhoneSchema }),
  handleLookupCustomerByPhone,
);

publicCustomerRouter.post(
  '/SaveProfile',
  customerProfileRateLimiter,
  validateRequest({ body: saveCustomerProfileSchema }),
  handleSaveCustomerProfile,
);

publicCustomerRouter.post(
  '/SendLoginOtp',
  customerOtpRateLimiter,
  validateRequest({ body: sendCustomerLoginOtpSchema }),
  handleSendCustomerLoginOtp,
);

publicCustomerRouter.post(
  '/VerifyLoginOtp',
  customerOtpRateLimiter,
  validateRequest({ body: verifyCustomerLoginOtpSchema }),
  handleVerifyCustomerLoginOtp,
);

publicCustomerRouter.get(
  '/GetMyProfile',
  authenticateCustomerMiddleware,
  handleGetMyCustomerProfile,
);

publicCustomerRouter.put(
  '/UpdateMyProfile',
  authenticateCustomerMiddleware,
  validateRequest({ body: updateCustomerProfileSchema }),
  handleUpdateMyCustomerProfile,
);

publicCustomerRouter.get(
  '/GetMyOrders',
  authenticateCustomerMiddleware,
  handleGetMyCustomerOrders,
);
