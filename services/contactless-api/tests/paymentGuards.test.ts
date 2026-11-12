import crypto from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { assertValidOrderStatusTransition } from '../src/modules/orderManagement/orderManagement.service';
import * as publicOrderRepo from '../src/modules/publicOrder/publicOrder.repository';
import { submitDemoPayment } from '../src/modules/publicOrder/publicOrder.service';
import { CashfreePaymentStrategy } from '../src/strategies/payment/cashfreePayment.strategy';
import { buildDynamicUpiPayload } from '../src/strategies/payment/demoUpiPayment.strategy';
import { RazorpayPaymentStrategy } from '../src/strategies/payment/razorpayPayment.strategy';
import { AppError } from '../src/utils/appError';

describe('Payment Strategies & State Machine Guards', () => {
  it('builds server-computed upi://pay URI with encoded payee name and token note', () => {
    const payload = buildDynamicUpiPayload({
      upiVpa: 'paytm.s211ne7@pty',
      upiPayeeName: 'MUNISWAMY JOSHVA',
      orderBusinessId: 'ORD2611120001',
      orderNumber: '#SH-IND-101',
      totalAmount: 60,
    });

    expect(payload.upiUri).toContain('pa=paytm.s211ne7%40pty');
    expect(payload.upiUri).toContain('pn=MUNISWAMY%20JOSHVA');
    expect(payload.upiUri).toContain('tr=ORD2611120001');
    expect(payload.upiUri).toContain('tn=Sharon%20Order%20SH-IND-101');
    expect(payload.upiUri).toContain('am=60.00');
    expect(payload.amountFormatted).toBe('60.00');
  });

  it('verifies Razorpay HMAC SHA256 webhook signatures', () => {
    const strategy = new RazorpayPaymentStrategy();
    const body = JSON.stringify({ event: 'payment.captured' });
    const sig = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest('hex');

    expect(strategy.verifyWebhookSignature(body, { 'x-razorpay-signature': sig })).toBe(true);
    expect(strategy.verifyWebhookSignature(body, { 'x-razorpay-signature': 'tampered' })).toBe(
      false,
    );
  });

  it('verifies Cashfree HMAC SHA256 webhook signatures', () => {
    const strategy = new CashfreePaymentStrategy();
    const timestamp = '1731400000';
    const body = JSON.stringify({ type: 'PAYMENT_SUCCESS_WEBHOOK' });
    const sig = crypto
      .createHmac('sha256', process.env.CASHFREE_WEBHOOK_SECRET!)
      .update(`${timestamp}${body}`)
      .digest('base64');

    expect(
      strategy.verifyWebhookSignature(body, {
        'x-webhook-signature': sig,
        'x-webhook-timestamp': timestamp,
      }),
    ).toBe(true);
    expect(
      strategy.verifyWebhookSignature(body, {
        'x-webhook-signature': 'invalid',
        'x-webhook-timestamp': timestamp,
      }),
    ).toBe(false);
  });

  it('rejects SubmitDemoPayment with 403 when outlet paymentProvider is not DEMO_UPI_INTENT', async () => {
    vi.spyOn(publicOrderRepo, 'findPublicOrderJoinedByBusinessId').mockResolvedValueOnce({
      id: 'ord-uuid',
      business_id: 'ORD2611120001',
      payment_transaction_id: 'TXN2611120001',
      order_number: '#SH-IND-101',
      outlet_id: 'out-uuid',
      outlet_business_id: 'OUT2611120001',
      outlet_name: 'Sharon Indiranagar Flagship',
      outlet_slug: 'indiranagar',
      outlet_upi_vpa: 'paytm.s211ne7@pty',
      outlet_upi_payee_name: 'MUNISWAMY JOSHVA',
      outlet_payment_provider: 'RAZORPAY',
      outlet_demo_auto_verify: false,
      outlet_estimated_prep_time_minutes: 5,
      customer_name: 'Rahul',
      customer_phone: '9876543210',
      table_or_token: null,
      items: [],
      subtotal: '60.00',
      tax: '0.00',
      total_amount: '60.00',
      payment_provider: 'RAZORPAY',
      payment_method: 'ONLINE',
      payment_status: 'PAYMENT_PENDING',
      payment_reference: null,
      order_status: 'RECEIVED',
      notes: null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await expect(
      submitDemoPayment('ORD2611120001', { customerConfirmedPaid: true }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'DEMO_PAYMENT_NOT_ALLOWED' });
  });

  it('blocks invalid order state transitions with 409 Conflict', () => {
    expect(() => assertValidOrderStatusTransition('RECEIVED', 'PREPARING')).not.toThrow();
    expect(() => assertValidOrderStatusTransition('CANCELLED', 'PREPARING')).toThrowError(
      AppError,
    );
    expect(() => assertValidOrderStatusTransition('COMPLETED', 'READY')).toThrowError(AppError);
  });
});
