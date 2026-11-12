import type { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../utils/apiResponse';
import { processPaymentWebhook } from './webhook.service';

export async function handlePaymentWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rawBody = req.rawBody ?? JSON.stringify(req.body ?? {});
    const result = await processPaymentWebhook({
      providerParam: req.params.provider,
      rawBody,
      headers: req.headers,
      body: req.body,
    });
    sendSuccess(res, 200, 'Webhook processed', result);
  } catch (err) {
    next(err);
  }
}
