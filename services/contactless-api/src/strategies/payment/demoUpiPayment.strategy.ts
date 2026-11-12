import type { UpiPayload } from '@sharon/shared';
import type {
  ParsedWebhookEvent,
  PaymentInitiationInput,
  PaymentInitiationResult,
  PaymentStrategy,
} from './paymentStrategy.interface';

export function buildDynamicUpiPayload(input: {
  upiVpa: string;
  upiPayeeName: string;
  orderBusinessId: string;
  orderNumber: string;
  totalAmount: number;
}): UpiPayload {
  const amountFormatted = input.totalAmount.toFixed(2);
  const cleanOrderNumber = input.orderNumber.replace(/^#/, '');
  const note = `Sharon Order ${cleanOrderNumber}`;

  const upiUri =
    `upi://pay?pa=${encodeURIComponent(input.upiVpa)}` +
    `&pn=${encodeURIComponent(input.upiPayeeName)}` +
    `&tr=${encodeURIComponent(input.orderBusinessId)}` +
    `&tn=${encodeURIComponent(note)}` +
    `&am=${encodeURIComponent(amountFormatted)}` +
    `&cu=INR`;

  return {
    upiUri,
    payeeName: input.upiPayeeName,
    amountFormatted,
  };
}

export class DemoUpiPaymentStrategy implements PaymentStrategy {
  public readonly provider = 'DEMO_UPI_INTENT' as const;

  public async initiatePayment(
    input: PaymentInitiationInput,
  ): Promise<PaymentInitiationResult> {
    const upiPayload = buildDynamicUpiPayload({
      upiVpa: input.upiVpa,
      upiPayeeName: input.upiPayeeName,
      orderBusinessId: input.orderBusinessId,
      orderNumber: input.orderNumber,
      totalAmount: input.totalAmount,
    });

    return {
      provider: this.provider,
      upiPayload,
    };
  }

  public verifyWebhookSignature(): boolean {
    // Demo UPI Intent has no automated bank webhook; verified manually by counter staff
    return false;
  }

  public parseWebhookPayload(): ParsedWebhookEvent | null {
    return null;
  }
}
