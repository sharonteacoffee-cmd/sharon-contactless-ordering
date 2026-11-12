import type { PaymentProvider, UpiPayload } from '@sharon/shared';

export interface PaymentInitiationInput {
  orderBusinessId: string;
  orderNumber: string;
  totalAmount: number;
  upiVpa: string;
  upiPayeeName: string;
  customerName: string;
  customerPhone: string;
}

export interface PaymentInitiationResult {
  provider: PaymentProvider;
  upiPayload?: UpiPayload;
  gatewayOrderId?: string;
}

export interface ParsedWebhookEvent {
  isPaidEvent: boolean;
  orderBusinessId: string;
  paymentReference: string;
  amountInRupees?: number;
}

export interface PaymentStrategy {
  readonly provider: PaymentProvider;
  initiatePayment(input: PaymentInitiationInput): Promise<PaymentInitiationResult>;
  verifyWebhookSignature(
    rawBody: Buffer | string,
    headers: Record<string, string | string[] | undefined>,
  ): boolean;
  parseWebhookPayload(payload: unknown): ParsedWebhookEvent | null;
}
