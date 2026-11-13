import cors from 'cors';
import express, { type Express, type Request } from 'express';
import helmet from 'helmet';
import { appConfig } from './config/app.config';
import { checkDatabaseHealth } from './database/connection';
import {
  errorHandlerMiddleware,
  notFoundMiddleware,
} from './middleware/errorHandler.middleware';
import { authRouter } from './modules/auth/auth.routes';
import { menuSyncRouter } from './modules/menuSync/menuSync.routes';
import {
  notificationPrivateRouter,
  notificationPublicRouter,
} from './modules/notification/notification.routes';
import { orderManagementRouter } from './modules/orderManagement/orderManagement.routes';
import { outletRouter } from './modules/outlet/outlet.routes';
import { outletStockRouter } from './modules/outletStock/outletStock.routes';
import { productRouter } from './modules/product/product.routes';
import { publicAuthRouter } from './modules/publicAuth/publicAuth.routes';
import { publicCustomerRouter } from './modules/publicCustomer/publicCustomer.routes';
import { publicMenuRouter } from './modules/publicMenu/publicMenu.routes';
import { publicOrderRouter } from './modules/publicOrder/publicOrder.routes';
import { publicOutletRouter } from './modules/publicOutlet/publicOutlet.routes';
import { qrMasterRouter } from './modules/qrMaster/qrMaster.routes';
import { uploadRouter } from './modules/upload/upload.routes';
import { userManagementRouter } from './modules/userManagement/userManagement.routes';
import { webhookRouter } from './modules/webhook/webhook.routes';
import './types/auth.types';
import { sendError, sendSuccess } from './utils/apiResponse';

export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }
        if (appConfig.corsAllowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error('Origin not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        (req as Request).rawBody = buf;
      },
    }),
  );

  // Health Checks
  app.get('/health', async (_req, res) => {
    const dbOk = await checkDatabaseHealth();
    if (!dbOk) {
      sendError(res, 503, 'DATABASE_UNAVAILABLE', 'Database connection check failed.');
      return;
    }
    sendSuccess(res, 200, 'Contactless API is healthy', {
      status: 'UP',
      timezone: 'UTC',
    });
  });

  app.get('/api/v1/Public/Health', async (_req, res) => {
    const dbOk = await checkDatabaseHealth();
    if (!dbOk) {
      sendError(res, 503, 'DATABASE_UNAVAILABLE', 'Database connection check failed.');
      return;
    }
    sendSuccess(res, 200, 'Contactless API is healthy', {
      status: 'UP',
      timezone: 'UTC',
    });
  });

  // Public APIs (/api/v1/Public/*)
  app.use('/api/v1/Public/Outlet', publicOutletRouter);
  app.use('/api/v1/Public/Menu', publicMenuRouter);
  app.use('/api/v1/Public/Auth', publicAuthRouter);
  app.use('/api/v1/Public/Customer', publicCustomerRouter);
  app.use('/api/v1/Public/Order', publicOrderRouter);
  app.use('/api/v1/Public/Webhook', webhookRouter);
  app.use('/api/v1/Public/Notification', notificationPublicRouter);

  // Private & Authorized APIs (/api/v1/Private/*)
  app.use('/api/v1/Private/Auth', authRouter);
  app.use('/api/v1/Private/MenuSync', menuSyncRouter);
  app.use('/api/v1/Private/OutletStock', outletStockRouter);
  app.use('/api/v1/Private/Order', orderManagementRouter);
  app.use('/api/v1/Private/QrMaster', qrMasterRouter);
  app.use('/api/v1/Private/Outlet', outletRouter);
  app.use('/api/v1/Private/Product', productRouter);
  app.use('/api/v1/Private/Upload', uploadRouter);
  app.use('/api/v1/Private/User', userManagementRouter);
  app.use('/api/v1/Private/Notification', notificationPrivateRouter);

  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
}
