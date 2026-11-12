import { Router } from 'express';
import { authenticateMiddleware } from '../../middleware/authenticate.middleware';
import { authorizeRoles } from '../../middleware/authorize.middleware';
import { publicNotificationRateLimiter } from '../../middleware/rateLimiter.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import {
  handleGetPushStatus,
  handleRegisterCustomerDevice,
  handleRegisterStaffDevice,
  handleUnregisterCustomerDevice,
  handleUnregisterStaffDevice,
} from './notification.controller';
import {
  registerCustomerPushTokenSchema,
  registerStaffPushTokenSchema,
  unregisterPushTokenSchema,
} from './notification.validator';

export const notificationPublicRouter: Router = Router();
export const notificationPrivateRouter: Router = Router();

notificationPublicRouter.post(
  '/RegisterCustomerDevice',
  publicNotificationRateLimiter,
  validateRequest({ body: registerCustomerPushTokenSchema }),
  handleRegisterCustomerDevice,
);

notificationPublicRouter.post(
  '/UnregisterCustomerDevice',
  publicNotificationRateLimiter,
  validateRequest({ body: unregisterPushTokenSchema }),
  handleUnregisterCustomerDevice,
);

notificationPrivateRouter.use(authenticateMiddleware, authorizeRoles('MD', 'OUTLET_STAFF'));

notificationPrivateRouter.post(
  '/RegisterStaffDevice',
  validateRequest({ body: registerStaffPushTokenSchema }),
  handleRegisterStaffDevice,
);

notificationPrivateRouter.post(
  '/UnregisterStaffDevice',
  validateRequest({ body: unregisterPushTokenSchema }),
  handleUnregisterStaffDevice,
);

notificationPrivateRouter.get('/GetPushStatus', handleGetPushStatus);
