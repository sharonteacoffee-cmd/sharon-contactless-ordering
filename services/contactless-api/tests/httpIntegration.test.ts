import http from 'node:http';
import type { AddressInfo } from 'node:net';
import jwt from 'jsonwebtoken';
import type { PoolClient } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { authConfig } from '../src/config/auth.config';
import * as businessIdGen from '../src/database/businessIdGenerator';
import * as dbConnection from '../src/database/connection';
import * as outletStockRepo from '../src/modules/outletStock/outletStock.repository';
import * as publicCustomerRepo from '../src/modules/publicCustomer/publicCustomer.repository';
import * as publicOrderRepo from '../src/modules/publicOrder/publicOrder.repository';
import * as publicOutletRepo from '../src/modules/publicOutlet/publicOutlet.repository';
import type { OutletDbRow } from '../src/modules/publicOutlet/publicOutlet.types';

describe('HTTP Route Integration Tests (Public & Private APIs)', () => {
  let server: http.Server;
  let baseUrl: string;

  const indiranagarOutlet: OutletDbRow = {
    id: '11111111-1111-4111-8111-111111111111',
    business_id: 'OUT2611120001',
    name: 'Sharon Indiranagar Flagship',
    slug: 'indiranagar',
    address: '100ft Road, HAL 2nd Stage, Indiranagar, Bengaluru',
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

  const staffToken = jwt.sign(
    {
      userId: 'usr-staff-a',
      businessId: 'USR2611120002',
      email: 'staff.a@sharonteastall.local',
      fullName: 'Indiranagar Staff',
      role: 'OUTLET_STAFF',
      outletId: indiranagarOutlet.id,
      outletBusinessId: indiranagarOutlet.business_id,
    },
    authConfig.jwtSecret,
    { algorithm: 'HS256', expiresIn: '1h' },
  );

  beforeAll(async () => {
    const app = createApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('GET /api/v1/Public/Outlet/GetPublicOutletBySlug/:outletSlug returns 200 sanitized DTO and 404 for unknown slug', async () => {
    const spy = vi
      .spyOn(publicOutletRepo, 'findOutletBySlug')
      .mockResolvedValueOnce(indiranagarOutlet)
      .mockResolvedValueOnce(null);

    const okRes = await fetch(`${baseUrl}/api/v1/Public/Outlet/GetPublicOutletBySlug/indiranagar`);
    expect(okRes.status).toBe(200);
    const okJson = (await okRes.json()) as {
      success: boolean;
      data: Record<string, unknown>;
    };
    expect(okJson.success).toBe(true);
    expect(okJson.data.businessId).toBe('OUT2611120001');
    expect(okJson.data.slug).toBe('indiranagar');
    expect(okJson.data.upiVpa).toBeUndefined();
    expect(okJson.data.upi_vpa).toBeUndefined();
    expect(okJson.data.scansCount).toBeUndefined();
    expect(okJson.data.demoAutoVerifyPayment).toBeUndefined();

    const notFoundRes = await fetch(
      `${baseUrl}/api/v1/Public/Outlet/GetPublicOutletBySlug/unknown-branch`,
    );
    expect(notFoundRes.status).toBe(404);
    const notFoundJson = (await notFoundRes.json()) as {
      success: boolean;
      error: { code: string };
    };
    expect(notFoundJson.success).toBe(false);
    expect(notFoundJson.error.code).toBe('OUTLET_NOT_FOUND');
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('POST /api/v1/Public/Order/CreatePublicOrder returns 422 on invalid phone and 201 with server-computed totals', async () => {
    const teaId = '8f29e0a1-1234-4abc-9def-001122334455';
    const modId = '11111111-2222-3333-4444-555555555551';

    // 1. Invalid phone -> 422 standardized error envelope
    const badRes = await fetch(`${baseUrl}/api/v1/Public/Order/CreatePublicOrder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outletSlug: 'indiranagar',
        customerName: 'Rahul Sharma',
        customerPhone: '12345',
        items: [{ menuItemId: teaId, quantity: 1, selectedModifierOptionIds: [] }],
      }),
    });
    expect(badRes.status).toBe(422);
    const badJson = (await badRes.json()) as {
      success: boolean;
      error: { code: string; details?: Array<{ field?: string }> };
      timestampUtc: string;
    };
    expect(badJson.success).toBe(false);
    expect(badJson.error.code).toBe('VALIDATION_ERROR');
    expect(badJson.timestampUtc).toMatch(/Z$/);

    // 2. Valid order -> 201 with DB-computed price, ORD..., TXN..., #SH-IND-101
    vi.spyOn(publicOutletRepo, 'findOutletBySlug').mockResolvedValueOnce(indiranagarOutlet);
    vi.spyOn(dbConnection, 'withTransaction').mockImplementationOnce(
      async (fn) => fn({} as PoolClient),
    );
    vi.spyOn(publicOrderRepo, 'findOutletMenuItemsForOrder').mockResolvedValueOnce([
      {
        id: teaId,
        name: 'Sharon Classic',
        base_price: '20.00',
        custom_price: null,
        is_active: true,
        is_available: true,
      },
    ]);
    vi.spyOn(publicOrderRepo, 'findModifierOptionsForOrder').mockResolvedValueOnce([
      {
        option_id: modId,
        option_name: 'Organic Jaggery',
        price_extra: '5.00',
        group_id: 'aaaa1111-1111-4111-8111-111111111111',
        group_name: 'Sugar Level',
        max_selection: 1,
      },
    ]);
    vi.spyOn(businessIdGen, 'generateNextBusinessId')
      .mockResolvedValueOnce('ORD2611120001')
      .mockResolvedValueOnce('TXN2611120001')
      .mockResolvedValueOnce('CUS2611120001');
    vi.spyOn(businessIdGen, 'generateNextOutletOrderNumber').mockResolvedValueOnce(
      '#SH-IND-101',
    );
    vi.spyOn(publicCustomerRepo, 'upsertCustomerProfile').mockResolvedValueOnce({
      id: 'cus-uuid-1',
      business_id: 'CUS2611120001',
      full_name: 'Rahul Sharma',
      phone: '9876543210',
      last_outlet_id: indiranagarOutlet.id,
      created_at: new Date('2026-11-12T10:15:30.000Z'),
      updated_at: new Date('2026-11-12T10:15:30.000Z'),
    });
    vi.spyOn(publicOrderRepo, 'insertOrder').mockResolvedValueOnce({
      id: 'ord-uuid-1',
      created_at: new Date('2026-11-12T10:15:30.000Z'),
      updated_at: new Date('2026-11-12T10:15:30.000Z'),
    });

    const okRes = await fetch(`${baseUrl}/api/v1/Public/Order/CreatePublicOrder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outletSlug: 'indiranagar',
        customerName: 'Rahul Sharma',
        customerPhone: '9876543210',
        items: [{ menuItemId: teaId, quantity: 2, selectedModifierOptionIds: [modId] }],
      }),
    });
    expect(okRes.status).toBe(201);
    const okJson = (await okRes.json()) as {
      success: boolean;
      data: {
        orderBusinessId: string;
        paymentTransactionId: string;
        orderNumber: string;
        totalAmount: number;
        paymentStatus: string;
        upiPayload?: { upiUri: string; amountFormatted: string };
      };
    };
    expect(okJson.success).toBe(true);
    expect(okJson.data.orderBusinessId).toBe('ORD2611120001');
    expect(okJson.data.paymentTransactionId).toBe('TXN2611120001');
    expect(okJson.data.orderNumber).toBe('#SH-IND-101');
    // (20 + 5) * 2 = 50.00 computed server-side
    expect(okJson.data.totalAmount).toBe(50);
    expect(okJson.data.paymentStatus).toBe('PAYMENT_PENDING');
    expect(okJson.data.upiPayload?.amountFormatted).toBe('50.00');
  });

  it('POST /api/v1/Public/Order/SubmitDemoPayment/:orderBusinessId enforces 403 when non-DEMO_UPI_INTENT and never sets PAID_VERIFIED', async () => {
    vi.spyOn(publicOrderRepo, 'findPublicOrderJoinedByBusinessId')
      .mockResolvedValueOnce({
        id: 'ord-uuid-rzp',
        business_id: 'ORD2611120002',
        payment_transaction_id: 'TXN2611120002',
        order_number: '#SH-IND-102',
        outlet_id: indiranagarOutlet.id,
        outlet_business_id: indiranagarOutlet.business_id,
        outlet_name: indiranagarOutlet.name,
        outlet_slug: indiranagarOutlet.slug,
        outlet_upi_vpa: indiranagarOutlet.upi_vpa,
        outlet_upi_payee_name: indiranagarOutlet.upi_payee_name,
        outlet_payment_provider: 'RAZORPAY',
        outlet_demo_auto_verify: false,
        outlet_estimated_prep_time_minutes: 5,
        customer_name: 'Rahul Sharma',
        customer_phone: '9876543210',
        table_or_token: null,
        items: [],
        subtotal: '50.00',
        tax: '0.00',
        total_amount: '50.00',
        payment_provider: 'RAZORPAY',
        payment_method: 'ONLINE',
        payment_status: 'PAYMENT_PENDING',
        payment_reference: null,
        order_status: 'RECEIVED',
        notes: null,
        created_at: new Date('2026-11-12T10:15:30.000Z'),
        updated_at: new Date('2026-11-12T10:15:30.000Z'),
      })
      .mockResolvedValueOnce({
        id: 'ord-uuid-demo',
        business_id: 'ORD2611120003',
        payment_transaction_id: 'TXN2611120003',
        order_number: '#SH-IND-103',
        outlet_id: indiranagarOutlet.id,
        outlet_business_id: indiranagarOutlet.business_id,
        outlet_name: indiranagarOutlet.name,
        outlet_slug: indiranagarOutlet.slug,
        outlet_upi_vpa: indiranagarOutlet.upi_vpa,
        outlet_upi_payee_name: indiranagarOutlet.upi_payee_name,
        outlet_payment_provider: 'DEMO_UPI_INTENT',
        outlet_demo_auto_verify: false,
        outlet_estimated_prep_time_minutes: 5,
        customer_name: 'Rahul Sharma',
        customer_phone: '9876543210',
        table_or_token: null,
        items: [],
        subtotal: '50.00',
        tax: '0.00',
        total_amount: '50.00',
        payment_provider: 'DEMO_UPI_INTENT',
        payment_method: 'UPI',
        payment_status: 'PAYMENT_PENDING',
        payment_reference: null,
        order_status: 'RECEIVED',
        notes: null,
        created_at: new Date('2026-11-12T10:15:30.000Z'),
        updated_at: new Date('2026-11-12T10:15:30.000Z'),
      });

    vi.spyOn(publicOrderRepo, 'updateOrderToDemoClaimed').mockResolvedValueOnce({
      updated_at: new Date('2026-11-12T10:16:00.000Z'),
    });

    const forbiddenRes = await fetch(
      `${baseUrl}/api/v1/Public/Order/SubmitDemoPayment/ORD2611120002`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerConfirmedPaid: true }),
      },
    );
    expect(forbiddenRes.status).toBe(403);

    const demoRes = await fetch(
      `${baseUrl}/api/v1/Public/Order/SubmitDemoPayment/ORD2611120003`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upiReturnDelayMs: 3000, customerConfirmedPaid: true }),
      },
    );
    expect(demoRes.status).toBe(200);
    const demoJson = (await demoRes.json()) as {
      data: { paymentStatus: string };
    };
    expect(demoJson.data.paymentStatus).toBe('UPI_CLAIMED_DEMO');
    expect(demoJson.data.paymentStatus).not.toBe('PAID_VERIFIED');
  });

  it('Private APIs enforce 401 without Bearer token, 403 for OUTLET_STAFF on MD-only routes, and 403 on cross-outlet IDOR', async () => {
    // 1. Missing Bearer token -> 401
    const unauthRes = await fetch(`${baseUrl}/api/v1/Private/Order/GetLiveOrders`);
    expect(unauthRes.status).toBe(401);

    // Mock active user lookup inside authenticateMiddleware for OUTLET_STAFF
    vi.spyOn(dbConnection, 'query').mockImplementation(async (sql) => {
      if (typeof sql === 'string' && sql.includes('FROM users u')) {
        return {
          rows: [
            {
              id: 'usr-staff-a',
              business_id: 'USR2611120002',
              email: 'staff.a@sharonteastall.local',
              full_name: 'Indiranagar Staff',
              role: 'OUTLET_STAFF',
              outlet_id: indiranagarOutlet.id,
              outlet_business_id: indiranagarOutlet.business_id,
              is_active: true,
            },
          ],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        };
      }
      throw new Error(`Unexpected SQL in mock: ${sql}`);
    });

    // 2. OUTLET_STAFF calling MD-only SyncFromWebsite -> 403
    const syncRes = await fetch(`${baseUrl}/api/v1/Private/MenuSync/SyncFromWebsite`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    expect(syncRes.status).toBe(403);

    // 3. OUTLET_STAFF calling MD-only GenerateQrCode -> 403
    const qrRes = await fetch(`${baseUrl}/api/v1/Private/QrMaster/GenerateQrCode`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${staffToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ outletBusinessId: 'OUT2611120001', label: 'Counter' }),
    });
    expect(qrRes.status).toBe(403);

    // 4. OUTLET_STAFF accessing Outlet B stock (cross-outlet IDOR) -> 403
    vi.spyOn(outletStockRepo, 'findOutletByBusinessId').mockResolvedValueOnce({
      id: '22222222-2222-4222-8222-222222222222',
      business_id: 'OUT2611120002',
      slug: 'new-thippasandra',
      name: 'Sharon New Thippasandra',
    });

    const idorRes = await fetch(
      `${baseUrl}/api/v1/Private/OutletStock/GetOutletStock/OUT2611120002`,
      {
        headers: { Authorization: `Bearer ${staffToken}` },
      },
    );
    expect(idorRes.status).toBe(403);
    const idorJson = (await idorRes.json()) as { error: { code: string } };
    expect(idorJson.error.code).toBe('FORBIDDEN_OUTLET_SCOPE');
  });
});
