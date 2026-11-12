import { Router } from 'express';
import { authenticateMiddleware } from '../../middleware/authenticate.middleware';
import { authorizeRoles } from '../../middleware/authorize.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import {
  handleGetSyncLogs,
  handlePreviewFromWebsite,
  handleSyncFromWebsite,
} from './menuSync.controller';
import { syncFromWebsiteSchema } from './menuSync.validator';

export const menuSyncRouter: Router = Router();

menuSyncRouter.use(authenticateMiddleware, authorizeRoles('MD'));

menuSyncRouter.get('/PreviewFromWebsite', handlePreviewFromWebsite);
menuSyncRouter.post(
  '/SyncFromWebsite',
  validateRequest({ body: syncFromWebsiteSchema }),
  handleSyncFromWebsite,
);
menuSyncRouter.get('/GetSyncLogs', handleGetSyncLogs);
