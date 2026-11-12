import type { PaymentProvider } from '@sharon/shared';
import { CashfreePaymentStrategy } from './cashfreePayment.strategy';
import { DemoUpiPaymentStrategy } from './demoUpiPayment.strategy';
import type { PaymentStrategy } from './paymentStrategy.interface';
import { RazorpayPaymentStrategy } from './razorpayPayment.strategy';

const strategyMap: Record<PaymentProvider, PaymentStrategy> = {
  DEMO_UPI_INTENT: new DemoUpiPaymentStrategy(),
  RAZORPAY: new RazorpayPaymentStrategy(),
  CASHFREE: new CashfreePaymentStrategy(),
};

export function getPaymentStrategy(provider: PaymentProvider): PaymentStrategy {
  return strategyMap[provider];
}
