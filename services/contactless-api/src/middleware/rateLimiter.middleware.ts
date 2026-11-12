import rateLimit from 'express-rate-limit';
import { toUTCISOString } from '@sharon/shared';

function createRateLimitHandler(message: string) {
  return (_req: unknown, res: { status: (code: number) => { json: (body: unknown) => void } }) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message,
      },
      timestampUtc: toUTCISOString(new Date()),
    });
  };
}

export const createPublicOrderRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many order requests. Please wait a moment and try again.'),
});

export const customerOtpRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many OTP attempts. Please try again after a few minutes.'),
});

export const staffLoginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many login attempts. Please wait 15 minutes before retrying.'),
});

export const demoPaymentRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many payment confirmation requests. Please wait briefly.'),
});

export const customerLookupRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many profile lookup requests. Please wait briefly.'),
});

export const customerProfileRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many profile update requests. Please wait briefly.'),
});

export const publicNotificationRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many push notification requests. Please wait briefly.'),
});
