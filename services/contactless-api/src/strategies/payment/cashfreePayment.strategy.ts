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
    const appId = integrationConfig.cashfree.appId;
    const secretKey = integrationConfig.cashfree.secretKey;

    if (!appId || !secretKey) {
      return {
        provider: this.provider,
        gatewayOrderId: `cf_order_${input.orderBusinessId}`,
      };
    }

    try {
      const apiUrl = 'https://api.cashfree.com/pg/orders';
      const cleanPhone = (input.customerPhone || '').replace(/\D/g, '');
      const validPhone = cleanPhone.length === 10 ? cleanPhone : '9999999999';

      const payload = {
        order_id: input.orderBusinessId,
        order_amount: Number(input.totalAmount.toFixed(2)),
        order_currency: 'INR',
        customer_details: {
          customer_id: input.customerPhone ? `cust_${validPhone}` : `cust_${input.orderBusinessId}`,
          customer_phone: validPhone,
          customer_name: input.customerName || 'Sharon Customer',
        },
        order_meta: {
          return_url: `https://order.sharonteastall.com/order/status/${input.orderBusinessId}?order_id={order_id}`,
          notify_url: 'https://contactless-api.sharonteastall.com/api/v1/Public/Webhook/PaymentCallback/cashfree',
        },
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'x-client-id': appId,
          'x-client-secret': secretKey,
          'x-api-version': '2023-08-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('[Cashfree] Order creation error:', response.status, errText);
        throw new Error(`Cashfree order creation failed with status ${response.status}`);
      }

      const data = (await response.json()) as {
        payment_session_id?: string;
        cf_order_id?: string | number;
        order_id?: string;
      };

      return {
        provider: this.provider,
        gatewayOrderId: data.payment_session_id || String(data.cf_order_id || input.orderBusinessId),
        paymentSessionId: data.payment_session_id,
      };
    } catch (error) {
      console.error('[Cashfree] Unexpected error in initiatePayment:', error);
      throw error;
    }
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
