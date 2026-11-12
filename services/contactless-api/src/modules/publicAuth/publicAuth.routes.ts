import { Router } from 'express';
import { customerOtpRateLimiter } from '../../middleware/rateLimiter.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import {
  handleSendCustomerOtp,
  handleVerifyCustomerOtp,
} from './publicAuth.controller';
import {
  sendCustomerOtpSchema,
  verifyCustomerOtpSchema,
} from './publicAuth.validator';

export const publicAuthRouter: Router = Router();

publicAuthRouter.post(
  '/SendCustomerOtp',
  customerOtpRateLimiter,
  validateRequest({ body: sendCustomerOtpSchema }),
  handleSendCustomerOtp,
);

publicAuthRouter.post(
  '/VerifyCustomerOtp',
  customerOtpRateLimiter,
  validateRequest({ body: verifyCustomerOtpSchema }),
  handleVerifyCustomerOtp,
);
