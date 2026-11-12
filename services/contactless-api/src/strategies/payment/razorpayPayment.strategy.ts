import crypto from 'node:crypto';
import { integrationConfig } from '../../config/integration.config';
import type {
  ParsedWebhookEvent,
  PaymentInitiationInput,
  PaymentInitiationResult,
  PaymentStrategy,
} from './paymentStrategy.interface';

interface RazorpayWebhookBody {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        amount?: number;
        notes?: {
          orderBusinessId?: string;
        };
      };
    };
    order?: {
      entity?: {
        receipt?: string;
      };
    };
  };
}

export class RazorpayPaymentStrategy implements PaymentStrategy {
  public readonly provider = 'RAZORPAY' as const;

  public async initiatePayment(
    input: PaymentInitiationInput,
  ): Promise<PaymentInitiationResult> {
    // Adapter stub ready for live Razorpay Orders API call when RAZORPAY_KEY_ID/SECRET are configured
    return {
      provider: this.provider,
      gatewayOrderId: `rzp_order_${input.orderBusinessId}`,
    };
  }

  public verifyWebhookSignature(
    rawBody: Buffer | string,
    headers: Record<string, string | string[] | undefined>,
  ): boolean {
    const secret = integrationConfig.razorpay.webhookSecret;
    const signatureHeader = headers['x-razorpay-signature'];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

    if (!secret || !signature) {
      return false;
    }

    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const sigBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  }

  public parseWebhookPayload(payload: unknown): ParsedWebhookEvent | null {
    const body = payload as RazorpayWebhookBody;
    const eventName = body?.event ?? '';
    const isPaidEvent = eventName === 'payment.captured' || eventName === 'order.paid';

    const orderBusinessId =
      body?.payload?.payment?.entity?.notes?.orderBusinessId ??
      body?.payload?.order?.entity?.receipt;
    const paymentReference = body?.payload?.payment?.entity?.id;
    const amountPaise = body?.payload?.payment?.entity?.amount;

    if (!orderBusinessId || !paymentReference) {
      return null;
    }

    return {
      isPaidEvent,
      orderBusinessId,
      paymentReference,
      amountInRupees: typeof amountPaise === 'number' ? amountPaise / 100 : undefined,
    };
  }
}
