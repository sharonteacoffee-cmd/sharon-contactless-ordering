import crypto from 'node:crypto';
import { integrationConfig } from '../../config/integration.config';
import type {
  ParsedWebhookEvent,
  PaymentInitiationInput,
  PaymentInitiationResult,
  PaymentStrategy,
} from './paymentStrategy.interface';

interface CashfreeWebhookBody {
  type?: string;
  data?: {
    order?: {
      order_id?: string;
      order_amount?: number;
    };
    payment?: {
      cf_payment_id?: string | number;
      payment_status?: string;
      payment_amount?: number;
    };
  };
}

export class CashfreePaymentStrategy implements PaymentStrategy {
  public readonly provider = 'CASHFREE' as const;

  public async initiatePayment(
    input: PaymentInitiationInput,
  ): Promise<PaymentInitiationResult> {
    // Adapter stub ready for live Cashfree PG Orders API when CASHFREE_APP_ID/SECRET_KEY are configured
    return {
      provider: this.provider,
      gatewayOrderId: `cf_order_${input.orderBusinessId}`,
    };
  }

  public verifyWebhookSignature(
    rawBody: Buffer | string,
    headers: Record<string, string | string[] | undefined>,
  ): boolean {
    const secret = integrationConfig.cashfree.webhookSecret;
    const signatureHeader = headers['x-webhook-signature'];
    const timestampHeader = headers['x-webhook-timestamp'];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    const timestamp = Array.isArray(timestampHeader) ? timestampHeader[0] : timestampHeader;

    if (!secret || !signature || !timestamp) {
      return false;
    }

    const bodyText = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}${bodyText}`)
      .digest('base64');

    const sigBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  }

  public parseWebhookPayload(payload: unknown): ParsedWebhookEvent | null {
    const body = payload as CashfreeWebhookBody;
    const paymentStatus = body?.data?.payment?.payment_status;
    const isPaidEvent =
      body?.type === 'PAYMENT_SUCCESS_WEBHOOK' || paymentStatus === 'SUCCESS';

    const orderBusinessId = body?.data?.order?.order_id;
    const paymentRefRaw = body?.data?.payment?.cf_payment_id;
    const paymentReference = paymentRefRaw !== undefined ? String(paymentRefRaw) : undefined;
    const amount = body?.data?.payment?.payment_amount ?? body?.data?.order?.order_amount;

    if (!orderBusinessId || !paymentReference) {
      return null;
    }

    return {
      isPaidEvent,
      orderBusinessId,
      paymentReference,
      amountInRupees: typeof amount === 'number' ? amount : undefined,
    };
  }
}
