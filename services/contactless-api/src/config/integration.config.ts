import { z } from 'zod';
import './app.config';

const integrationEnvSchema = z.object({
  MAIN_WEBSITE_API_URL: z
    .string()
    .url()
    .default('https://api.sharonteastall.com/api/v1/Product/GetPublicProducts'),
  PAYMENT_ACTIVE_PROVIDER: z
    .enum(['DEMO_UPI_INTENT', 'RAZORPAY', 'CASHFREE'])
    .default('DEMO_UPI_INTENT'),
  RAZORPAY_KEY_ID: z.string().optional().default(''),
  RAZORPAY_KEY_SECRET: z.string().optional().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(''),
  CASHFREE_APP_ID: z.string().optional().default(''),
  CASHFREE_CLIENT_ID: z.string().optional().default(''),
  CASHFREE_SECRET_KEY: z.string().optional().default(''),
  CASHFREE_CLIENT_SECRET: z.string().optional().default(''),
  CASHFREE_WEBHOOK_SECRET: z.string().optional().default(''),
});

const parsed = integrationEnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('[config:integration] Invalid integration configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid integration environment configuration');
}

const resolvedCashfreeAppId = parsed.data.CASHFREE_APP_ID || parsed.data.CASHFREE_CLIENT_ID;
const resolvedCashfreeSecret = parsed.data.CASHFREE_SECRET_KEY || parsed.data.CASHFREE_CLIENT_SECRET;
const resolvedCashfreeWebhookSecret = parsed.data.CASHFREE_WEBHOOK_SECRET || resolvedCashfreeSecret;

export const integrationConfig = {
  mainWebsiteApiUrl: parsed.data.MAIN_WEBSITE_API_URL,
  paymentActiveProvider: parsed.data.PAYMENT_ACTIVE_PROVIDER,
  razorpay: {
    keyId: parsed.data.RAZORPAY_KEY_ID,
    keySecret: parsed.data.RAZORPAY_KEY_SECRET,
    webhookSecret: parsed.data.RAZORPAY_WEBHOOK_SECRET,
  },
  cashfree: {
    appId: resolvedCashfreeAppId,
    secretKey: resolvedCashfreeSecret,
    webhookSecret: resolvedCashfreeWebhookSecret,
  },
} as const;
