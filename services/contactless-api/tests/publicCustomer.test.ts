import crypto from 'node:crypto';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import jwt from 'jsonwebtoken';
import type { PoolClient } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { authConfig } from '../src/config/auth.config';
import * as businessIdGen from '../src/database/businessIdGenerator';
import * as dbConnection from '../src/database/connection';
import * as publicCustomerRepo from '../src/modules/publicCustomer/publicCustomer.repository';

describe('Public Customer Profile, OTP Login & Order History (/api/v1/Public/Customer/*)', () => {
  let server: http.Server;
  let baseUrl: string;

  const customerRow = {
    id: 'cus-uuid-1',
    business_id: 'CUS2611120001',
    full_name: 'Priya Nair',
    phone: '9876543210',
    last_outlet_id: 'out-1',
    created_at: new Date('2026-11-12T10:00:00.000Z'),
    updated_at: new Date('2026-11-12T10:00:00.000Z'),
  };

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

  it('GET /LookupByPhone returns minimal { found, fullName } DTO with zero sensitive leakage', async () => {
    vi.spyOn(publicCustomerRepo, 'findCustomerByPhone')
      .mockResolvedValueOnce(customerRow)
      .mockResolvedValueOnce(null);

    const foundRes = await fetch(
      `${baseUrl}/api/v1/Public/Customer/LookupByPhone?phone=9876543210`,
    );
    expect(foundRes.status).toBe(200);
    const foundJson = (await foundRes.json()) as {
      success: boolean;
      data: Record<string, unknown>;
    };
    expect(foundJson.success).toBe(true);
    expect(foundJson.data).toEqual({ found: true, fullName: 'Priya Nair' });
    expect(foundJson.data.businessId).toBeUndefined();
    expect(foundJson.data.phone).toBeUndefined();

    const notFoundRes = await fetch(
      `${baseUrl}/api/v1/Public/Customer/LookupByPhone?phone=9123456789`,
    );
    expect(notFoundRes.status).toBe(200);
    const notFoundJson = (await notFoundRes.json()) as {
      data: Record<string, unknown>;
    };
    expect(notFoundJson.data).toEqual({ found: false, fullName: null });
  });

  it('POST /SaveProfile upserts CUS... profile and returns maskedPhone', async () => {
    vi.spyOn(dbConnection, 'withTransaction').mockImplementationOnce(
      async (fn) => fn({} as PoolClient),
    );
    vi.spyOn(businessIdGen, 'generateNextBusinessId').mockResolvedValueOnce('CUS2611120001');
    vi.spyOn(publicCustomerRepo, 'upsertCustomerProfile').mockResolvedValueOnce(customerRow);

    const res = await fetch(`${baseUrl}/api/v1/Public/Customer/SaveProfile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: 'Priya Nair', phone: '9876543210' }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      success: boolean;
      data: { businessId: string; fullName: string; phone: string; maskedPhone: string };
    };
    expect(json.success).toBe(true);
    expect(json.data.businessId).toBe('CUS2611120001');
    expect(json.data.fullName).toBe('Priya Nair');
    expect(json.data.maskedPhone).toBe('+91 •••••• 3210');
  });

  it('POST /SendLoginOtp + POST /VerifyLoginOtp enforces name for new users and issues CUSTOMER_SESSION JWT', async () => {
    vi.spyOn(crypto, 'randomInt').mockReturnValue(654321 as never);

    const sendRes = await fetch(`${baseUrl}/api/v1/Public/Customer/SendLoginOtp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9876543210' }),
    });
    expect(sendRes.status).toBe(200);
    const sendJson = (await sendRes.json()) as {
      data: { expiresInSeconds: number; devOtpPreview?: string };
    };
    expect(sendJson.data.expiresInSeconds).toBe(300);
    // In NODE_ENV=test, devOtpPreview is not exposed
    expect(sendJson.data.devOtpPreview).toBeUndefined();

    // First attempt: new customer without fullName -> 422
    vi.spyOn(dbConnection, 'withTransaction').mockImplementation(
      async (fn) => fn({} as PoolClient),
    );
    vi.spyOn(publicCustomerRepo, 'findCustomerByPhone')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const missingNameRes = await fetch(
      `${baseUrl}/api/v1/Public/Customer/VerifyLoginOtp`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '9876543210', otpCode: '654321' }),
      },
    );
    expect(missingNameRes.status).toBe(422);

    // Second attempt: provide fullName -> 200 + JWT
    vi.spyOn(businessIdGen, 'generateNextBusinessId').mockResolvedValueOnce('CUS2611120001');
    vi.spyOn(publicCustomerRepo, 'upsertCustomerProfile').mockResolvedValueOnce(customerRow);

    const verifyRes = await fetch(
      `${baseUrl}/api/v1/Public/Customer/VerifyLoginOtp`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '9876543210',
          otpCode: '654321',
          fullName: 'Priya Nair',
        }),
      },
    );
    expect(verifyRes.status).toBe(200);
    const verifyJson = (await verifyRes.json()) as {
      data: {
        customerAccessToken: string;
        expiresInSeconds: number;
        customer: { businessId: string; fullName: string };
      };
    };
    expect(verifyJson.data.expiresInSeconds).toBe(86400);
    expect(verifyJson.data.customer.businessId).toBe('CUS2611120001');

    const decoded = jwt.verify(verifyJson.data.customerAccessToken, authConfig.jwtSecret) as {
      purpose: string;
      customerId: string;
      phone: string;
    };
    expect(decoded.purpose).toBe('CUSTOMER_SESSION');
    expect(decoded.customerId).toBe('cus-uuid-1');
    expect(decoded.phone).toBe('9876543210');
  });

  it('requires CUSTOMER_SESSION JWT for GetMyProfile, UpdateMyProfile & GetMyOrders and returns customer-scoped orders', async () => {
    // 1. Missing token -> 401
    const unauthProfile = await fetch(`${baseUrl}/api/v1/Public/Customer/GetMyProfile`);
    expect(unauthProfile.status).toBe(401);

    const unauthOrders = await fetch(`${baseUrl}/api/v1/Public/Customer/GetMyOrders`);
    expect(unauthOrders.status).toBe(401);

    // 2. Staff JWT rejected on customer-only route -> 401
    const staffToken = jwt.sign(
      { userId: 'usr-1', role: 'OUTLET_STAFF' },
      authConfig.jwtSecret,
      { algorithm: 'HS256', expiresIn: '1h' },
    );
    const staffAttempt = await fetch(`${baseUrl}/api/v1/Public/Customer/GetMyOrders`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    expect(staffAttempt.status).toBe(401);

    // 3. Valid CUSTOMER_SESSION JWT -> returns scoped profile & orders
    const customerToken = jwt.sign(
      {
        purpose: 'CUSTOMER_SESSION',
        customerId: 'cus-uuid-1',
        customerBusinessId: 'CUS2611120001',
        phone: '9876543210',
      },
      authConfig.jwtSecret,
      { algorithm: 'HS256', expiresIn: '1h' },
    );

    vi.spyOn(publicCustomerRepo, 'findCustomerById').mockResolvedValueOnce(customerRow);
    const profileRes = await fetch(`${baseUrl}/api/v1/Public/Customer/GetMyProfile`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    expect(profileRes.status).toBe(200);
    const profileJson = (await profileRes.json()) as { data: { businessId: string } };
    expect(profileJson.data.businessId).toBe('CUS2611120001');

    const ordersSpy = vi
      .spyOn(publicCustomerRepo, 'findCustomerOrders')
      .mockResolvedValueOnce([
        {
          business_id: 'ORD2611120001',
          order_number: '#SH-IND-101',
          outlet_business_id: 'OUT2611120001',
          outlet_name: 'Sharon Indiranagar Flagship',
          outlet_slug: 'indiranagar',
          items: [],
          subtotal: '40.00',
          tax: '0.00',
          total_amount: '40.00',
          payment_provider: 'DEMO_UPI_INTENT',
          payment_status: 'PAID_VERIFIED',
          order_status: 'COMPLETED',
          created_at: new Date('2026-11-12T10:30:00.000Z'),
        },
      ]);

    const ordersRes = await fetch(`${baseUrl}/api/v1/Public/Customer/GetMyOrders`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    expect(ordersRes.status).toBe(200);
    const ordersJson = (await ordersRes.json()) as {
      data: Array<{ orderBusinessId: string; totalAmount: number; createdAt: string }>;
    };
    expect(ordersSpy).toHaveBeenCalledWith('cus-uuid-1', '9876543210');
    expect(ordersJson.data).toHaveLength(1);
    expect(ordersJson.data[0].orderBusinessId).toBe('ORD2611120001');
    expect(ordersJson.data[0].totalAmount).toBe(40);
    expect(ordersJson.data[0].createdAt).toBe('2026-11-12T10:30:00.000Z');
  });
});
