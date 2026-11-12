import { Router } from 'express';
import { handlePaymentWebhook } from './webhook.controller';

export const webhookRouter: Router = Router();

webhookRouter.post('/PaymentCallback/:provider', handlePaymentWebhook);
