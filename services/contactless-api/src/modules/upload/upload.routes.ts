import { Router } from 'express';
import multer from 'multer';
import { authenticateMiddleware } from '../../middleware/authenticate.middleware';
import { authorizeRoles } from '../../middleware/authorize.middleware';
import { handleUploadImage } from './upload.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

export const uploadRouter: Router = Router();

uploadRouter.use(authenticateMiddleware, authorizeRoles('MD', 'OUTLET_STAFF'));

uploadRouter.post('/Image', upload.single('image'), handleUploadImage);
uploadRouter.post('/UploadImage', upload.single('image'), handleUploadImage);
