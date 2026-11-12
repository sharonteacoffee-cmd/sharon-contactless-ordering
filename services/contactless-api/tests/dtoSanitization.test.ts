import { describe, expect, it } from 'vitest';
import {
  maskCustomerPhone,
  toPublicOrderTrackingDto,
  type PublicOrderJoinedRow,
} from '../src/modules/publicOrder/publicOrder.dto';
import { toPublicOutletDto } from '../src/modules/publicOutlet/publicOutlet.dto';
import type { OutletDbRow } from '../src/modules/publicOutlet/publicOutlet.types';

describe('Public DTO Sanitization', () => {
  it('strips sensitive fields from OutletDbRow in toPublicOutletDto', () => {
    const dbRow: OutletDbRow = {
      id: '11111111-1111-4111-8111-111111111111',
      business_id: 'OUT2611120001',
      name: 'Sharon Indiranagar Flagship',
      slug: 'indiranagar',
      address: '100ft Road, Indiranagar',
      phone: '+91 99169 99209',
      operating_hours: '6:00 AM - 11:00 PM',
      is_active: true,
      is_ordering_enabled: true,
      customer_auth_mode: 'DIRECT_GUEST',
      require_customer_phone: true,
      require_customer_name: true,
      payment_provider: 'DEMO_UPI_INTENT',
      demo_auto_verify_payment: false,
      upi_vpa: 'paytm.s211ne7@pty',
      upi_payee_name: 'MUNISWAMY JOSHVA',
      estimated_prep_time_minutes: 5,
      created_at: new Date('2026-11-12T10:00:00.000Z'),
      updated_at: new Date('2026-11-12T10:00:00.000Z'),
    };

    const dto = toPublicOutletDto(dbRow) as unknown as Record<string, unknown>;

    expect(dto).toEqual({
      businessId: 'OUT2611120001',
      name: 'Sharon Indiranagar Flagship',
      slug: 'indiranagar',
      address: '100ft Road, Indiranagar',
      operatingHours: '6:00 AM - 11:00 PM',
      isOrderingEnabled: true,
      customerAuthMode: 'DIRECT_GUEST',
      requireCustomerPhone: true,
      requireCustomerName: true,
      paymentProvider: 'DEMO_UPI_INTENT',
      estimatedPrepTimeMinutes: 5,
    });

    expect(dto.upiVpa).toBeUndefined();
    expect(dto.upi_vpa).toBeUndefined();
    expect(dto.upiPayeeName).toBeUndefined();
    expect(dto.demoAutoVerifyPayment).toBeUndefined();
    expect(dto.phone).toBeUndefined();
    expect(dto.id).toBeUndefined();
  });

  it('masks customer phone and omits internal IDs in toPublicOrderTrackingDto', () => {
    expect(maskCustomerPhone('9876543210')).toBe('+91 •••••• 3210');

    const row: PublicOrderJoinedRow = {
      id: '22222222-2222-4222-8222-222222222222',
      business_id: 'ORD2611120001',
      payment_transaction_id: 'TXN2611120001',
      order_number: '#SH-IND-101',
      outlet_id: '11111111-1111-4111-8111-111111111111',
      outlet_business_id: 'OUT2611120001',
      outlet_name: 'Sharon Indiranagar Flagship',
      outlet_slug: 'indiranagar',
      outlet_upi_vpa: 'paytm.s211ne7@pty',
      outlet_upi_payee_name: 'MUNISWAMY JOSHVA',
      outlet_payment_provider: 'DEMO_UPI_INTENT',
      outlet_demo_auto_verify: false,
      outlet_estimated_prep_time_minutes: 5,
      customer_name: 'Rahul Sharma',
      customer_phone: '9876543210',
      table_or_token: 'Counter',
      items: [],
      subtotal: '60.00',
      tax: '0.00',
      total_amount: '60.00',
      payment_provider: 'DEMO_UPI_INTENT',
      payment_method: 'UPI',
      payment_status: 'UPI_CLAIMED_DEMO',
      payment_reference: null,
      order_status: 'RECEIVED',
      notes: null,
      created_at: new Date('2026-11-12T10:15:30.000Z'),
      updated_at: new Date('2026-11-12T10:15:35.000Z'),
    };

    const trackingDto = toPublicOrderTrackingDto(row) as unknown as Record<string, unknown>;
    expect(trackingDto.maskedCustomerPhone).toBe('+91 •••••• 3210');
    expect(trackingDto.customerPhone).toBeUndefined();
    expect(trackingDto.paymentTransactionId).toBeUndefined();
    expect(trackingDto.createdAt).toBe('2026-11-12T10:15:30.000Z');
  });
});
