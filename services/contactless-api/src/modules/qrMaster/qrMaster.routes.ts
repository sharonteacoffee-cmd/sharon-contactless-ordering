import { Router } from 'express';
import { authenticateMiddleware } from '../../middleware/authenticate.middleware';
import { authorizeRoles } from '../../middleware/authorize.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import {
  handleGenerateQrCode,
  handleGetQrCodes,
  handleUpdateQrStatus,
} from './qrMaster.controller';
import {
  generateQrSchema,
  getQrCodesQuerySchema,
  qrBusinessIdParamsSchema,
  updateQrStatusSchema,
} from './qrMaster.validator';

export const qrMasterRouter: Router = Router();

qrMasterRouter.use(authenticateMiddleware, authorizeRoles('MD'));

qrMasterRouter.get(
  '/GetQrCodes',
  validateRequest({ query: getQrCodesQuerySchema }),
  handleGetQrCodes,
);

qrMasterRouter.post(
  '/GenerateQrCode',
  validateRequest({ body: generateQrSchema }),
  handleGenerateQrCode,
);

qrMasterRouter.patch(
  '/UpdateQrStatus/:qrBusinessId',
  validateRequest({
    params: qrBusinessIdParamsSchema,
    body: updateQrStatusSchema,
  }),
  handleUpdateQrStatus,
);
