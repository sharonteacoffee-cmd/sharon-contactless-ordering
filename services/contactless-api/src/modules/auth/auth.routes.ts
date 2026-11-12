import { Router } from 'express';
import { authenticateMiddleware } from '../../middleware/authenticate.middleware';
import { staffLoginRateLimiter } from '../../middleware/rateLimiter.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import {
  handleGetCurrentProfile,
  handleStaffLogin,
} from './auth.controller';
import { staffLoginSchema } from './auth.validator';

export const authRouter: Router = Router();

authRouter.post(
  '/Login',
  staffLoginRateLimiter,
  validateRequest({ body: staffLoginSchema }),
  handleStaffLogin,
);

authRouter.get(
  '/GetCurrentProfile',
  authenticateMiddleware,
  handleGetCurrentProfile,
);
