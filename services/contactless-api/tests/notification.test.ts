import http from 'node:http';
import type { AddressInfo } from 'node:net';
import * as firebaseAdminApp from 'firebase-admin/app';
import * as firebaseAdminMessaging from 'firebase-admin/messaging';
import jwt from 'jsonwebtoken';
import type { PoolClient } from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { authConfig } from '../src/config/auth.config';
import * as firebaseConfigMod from '../src/config/firebase.config';
import * as businessIdGen from '../src/database/businessIdGenerator';
import * as dbConnection from '../src/database/connection';
import {
  resetFcmDispatcherLogStateForTest,
  sendFcmMulticast,
} from '../src/modules/notification/fcmDispatcher';
import * as notificationRepo from '../src/modules/notification/notification.repository';
import {
  notifyCustomerOrderStatus,
  notifyCustomerPaymentVerified,
  notifyStaffNewOrder,
} from '../src/modules/notification/notification.service';

vi.mock('firebase-admin/app', () => ({
  getApps: vi.fn(() => []),
  initializeApp: vi.fn(() => ({ name: 'mock-firebase-app' })),
  cert: vi.fn((c) => c),
}));

vi.mock('firebase-admin/messaging', () => ({
  getMessaging: vi.fn(() => ({
    sendEachForMulticast: vi.fn(),
  })),
}));

describe('FCM Web Push Notifications (/api/v1/Public/Notification/* & /api/v1/Private/Notification/*)', () => {
  let server: http.Server;
  let baseUrl: string;

  const mdToken = jwt.sign(
    {
      userId: 'usr-md-uuid',
      businessId: 'USR2611120001',
      email: 'md@sharonteastall.com',
      fullName: 'Managing Director',
      role: 'MD',
      outletId: null,
      outletBusinessId: null,
    },
    authConfig.jwtSecret,
    { algorithm: 'HS256', expiresIn: '1h' },
  );

  const staffToken = jwt.sign(
    {
      userId: 'usr-staff-uuid',
      businessId: 'USR2611120002',
      email: 'indiranagar@sharonteastall.com',
      fullName: 'Indiranagar Counter Staff',
      role: 'OUTLET_STAFF',
      outletId: 'out-ind-uuid',
      outletBusinessId: 'OUT2611120001',
    },
    authConfig.jwtSecret,
    { algorithm: 'HS256', expiresIn: '1h' },
  );

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

  function mockAuthenticateAs(role: 'MD' | 'OUTLET_STAFF'): void {
    vi.spyOn(dbConnection, 'query').mockImplementation(async (sql) => {
      if (typeof sql === 'string' && sql.includes('FROM users u')) {
        if (role === 'MD') {
          return {
            rows: [
              {
                id: 'usr-md-uuid',
                business_id: 'USR2611120001',
                email: 'md@sharonteastall.com',
                full_name: 'Managing Director',
                role: 'MD',
                outlet_id: null,
                outlet_business_id: null,
                is_active: true,
              },
            ],
            rowCount: 1,
            command: 'SELECT',
            oid: 0,
            fields: [],
          };
        }
        return {
          rows: [
            {
              id: 'usr-staff-uuid',
              business_id: 'USR2611120002',
              email: 'indiranagar@sharonteastall.com',
              full_name: 'Indiranagar Counter Staff',
              role: 'OUTLET_STAFF',
              outlet_id: 'out-ind-uuid',
              outlet_business_id: 'OUT2611120001',
              is_active: true,
            },
          ],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        };
      }
      return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
    });
  }

  beforeAll(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
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
    vi.clearAllMocks();
    resetFcmDispatcherLogStateForTest();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('enforces IDOR on POST /Private/Notification/RegisterStaffDevice and registers scoped devices', async () => {
    mockAuthenticateAs('OUTLET_STAFF');

    const forbiddenRes = await fetch(
      `${baseUrl}/api/v1/Private/Notification/RegisterStaffDevice`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${staffToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fcmToken: 'fcm-staff-token-valid-1234567890',
          outletBusinessId: 'OUT2611120099',
        }),
      },
    );
    expect(forbiddenRes.status).toBe(403);

    const fakeClient = {} as PoolClient;
    vi.spyOn(dbConnection, 'withTransaction').mockImplementation(async (cb) => cb(fakeClient));
    vi.spyOn(businessIdGen, 'generatePushTokenBusinessId').mockResolvedValue('PSH2611120001');
    const upsertSpy = vi.spyOn(notificationRepo, 'upsertPushNotificationToken').mockResolvedValue({
      business_id: 'PSH2611120001',
      target_role: 'STAFF',
      updated_at: new Date('2026-11-12T12:15:00.000Z'),
    });

    const okRes = await fetch(`${baseUrl}/api/v1/Private/Notification/RegisterStaffDevice`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${staffToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fcmToken: 'fcm-staff-token-valid-1234567890',
      }),
    });
    expect(okRes.status).toBe(200);
    const body = (await okRes.json()) as {
      success: boolean;
      data: { tokenBusinessId: string; targetRole: string; fcmConfigured: boolean };
    };
    expect(body.success).toBe(true);
    expect(body.data.tokenBusinessId).toBe('PSH2611120001');
    expect(body.data.targetRole).toBe('STAFF');
    expect(upsertSpy).toHaveBeenCalledWith(
      fakeClient,
      expect.objectContaining({
        businessId: 'PSH2611120001',
        targetRole: 'STAFF',
        userId: 'usr-staff-uuid',
        outletId: 'out-ind-uuid',
      }),
    );
  });

  it('allows MD to register global staff push notifications and query GetPushStatus', async () => {
    mockAuthenticateAs('MD');
    const fakeClient = {} as PoolClient;
    vi.spyOn(dbConnection, 'withTransaction').mockImplementation(async (cb) => cb(fakeClient));
    vi.spyOn(businessIdGen, 'generatePushTokenBusinessId').mockResolvedValue('PSH2611120002');
    const upsertSpy = vi.spyOn(notificationRepo, 'upsertPushNotificationToken').mockResolvedValue({
      business_id: 'PSH2611120002',
      target_role: 'STAFF',
      updated_at: new Date('2026-11-12T12:16:00.000Z'),
    });
    vi.spyOn(notificationRepo, 'countActiveStaffPushDevices').mockResolvedValue(2);

    const regRes = await fetch(`${baseUrl}/api/v1/Private/Notification/RegisterStaffDevice`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mdToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fcmToken: 'fcm-md-token-valid-1234567890123',
      }),
    });
    expect(regRes.status).toBe(200);
    expect(upsertSpy).toHaveBeenCalledWith(
      fakeClient,
      expect.objectContaining({
        targetRole: 'STAFF',
        userId: 'usr-md-uuid',
        outletId: null,
      }),
    );

    const statusRes = await fetch(`${baseUrl}/api/v1/Private/Notification/GetPushStatus`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${mdToken}` },
    });
    expect(statusRes.status).toBe(200);
    const statusBody = (await statusRes.json()) as {
      data: { fcmConfigured: boolean; activeDeviceCount: number };
    };
    expect(statusBody.data).toEqual({ fcmConfigured: false, activeDeviceCount: 2 });
  });

  it('registers & unregisters customer push device on rate-limited public endpoints', async () => {
    const badRes = await fetch(
      `${baseUrl}/api/v1/Public/Notification/RegisterCustomerDevice`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fcmToken: 'short' }),
      },
    );
    expect(badRes.status).toBe(422);
    expect(badRes.headers.get('ratelimit-limit')).toBeTruthy();

    vi.spyOn(notificationRepo, 'findOrderContextForPush').mockResolvedValue({
      id: 'ord-uuid-1',
      business_id: 'ORD2611120001',
      outlet_id: 'out-ind-uuid',
      customer_id: 'cus-uuid-1',
      customer_phone: '9876543210',
      order_number: '#SH-IND-101',
    });
    const fakeClient = {} as PoolClient;
    vi.spyOn(dbConnection, 'withTransaction').mockImplementation(async (cb) => cb(fakeClient));
    vi.spyOn(businessIdGen, 'generatePushTokenBusinessId').mockResolvedValue('PSH2611120003');
    const upsertSpy = vi.spyOn(notificationRepo, 'upsertPushNotificationToken').mockResolvedValue({
      business_id: 'PSH2611120003',
      target_role: 'CUSTOMER',
      updated_at: new Date('2026-11-12T12:17:00.000Z'),
    });

    const okRes = await fetch(`${baseUrl}/api/v1/Public/Notification/RegisterCustomerDevice`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fcmToken: 'fcm-cust-token-valid-1234567890',
        orderBusinessId: 'ORD2611120001',
      }),
    });
    expect(okRes.status).toBe(200);
    expect(upsertSpy).toHaveBeenCalledWith(
      fakeClient,
      expect.objectContaining({
        businessId: 'PSH2611120003',
        targetRole: 'CUSTOMER',
        outletId: 'out-ind-uuid',
        customerId: 'cus-uuid-1',
        customerPhone: '9876543210',
        orderBusinessId: 'ORD2611120001',
      }),
    );

    const deactivateSpy = vi
      .spyOn(notificationRepo, 'deactivateCustomerPushToken')
      .mockResolvedValue();
    const unregRes = await fetch(
      `${baseUrl}/api/v1/Public/Notification/UnregisterCustomerDevice`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fcmToken: 'fcm-cust-token-valid-1234567890' }),
      },
    );
    expect(unregRes.status).toBe(200);
    expect(deactivateSpy).toHaveBeenCalledWith('fcm-cust-token-valid-1234567890');
  });

  it('skips push cleanly when Firebase Admin is unconfigured and deactivates invalid tokens on multicast failure', async () => {
    vi.spyOn(firebaseConfigMod, 'resolveFirebaseAdminCredentials').mockReturnValue(null);

    const unconfiguredSummary = await sendFcmMulticast(['token-abc-1234567890123456'], {
      title: 'Test',
      body: 'Body',
      link: '/kds',
    });
    expect(unconfiguredSummary).toEqual({
      sentCount: 0,
      failedCount: 0,
      deactivatedTokens: [],
    });

    vi.spyOn(firebaseConfigMod, 'resolveFirebaseAdminCredentials').mockReturnValue({
      projectId: 'sharon-demo-proj',
      clientEmail: 'fcm@sharon-demo-proj.iam.gserviceaccount.com',
      privateKey: '-----BEGIN PRIVATE KEY-----\nMOCK\n-----END PRIVATE KEY-----\n',
    });
    vi.mocked(firebaseAdminApp.getApps).mockReturnValue([{ name: 'mock' } as never]);
    const sendEachMock = vi.fn().mockResolvedValue({
      successCount: 1,
      failureCount: 2,
      responses: [
        { success: true, messageId: 'msg-1' },
        {
          success: false,
          error: { code: 'messaging/registration-token-not-registered', message: 'Not registered' },
        },
        {
          success: false,
          error: { code: 'messaging/invalid-registration-token', message: 'Invalid token' },
        },
      ],
    });
    vi.mocked(firebaseAdminMessaging.getMessaging).mockReturnValue({
      sendEachForMulticast: sendEachMock,
    } as never);
    const deactivateInvalidSpy = vi
      .spyOn(notificationRepo, 'deactivateInvalidPushTokens')
      .mockResolvedValue();

    const summary = await sendFcmMulticast(
      ['valid-tok-12345678901234567890', 'stale-tok-12345678901234567890', 'bad-tok-12345678901234567890'],
      {
        title: 'New Order #SH-IND-101',
        body: 'Indiranagar • INR 60.00',
        link: '/kds',
        requireInteraction: true,
      },
    );

    expect(sendEachMock).toHaveBeenCalledTimes(1);
    expect(deactivateInvalidSpy).toHaveBeenCalledWith([
      'stale-tok-12345678901234567890',
      'bad-tok-12345678901234567890',
    ]);
    expect(summary).toEqual({
      sentCount: 1,
      failedCount: 2,
      deactivatedTokens: ['stale-tok-12345678901234567890', 'bad-tok-12345678901234567890'],
    });
  });

  it('dispatches staff new-order and customer status/payment push notifications asynchronously', async () => {
    vi.spyOn(firebaseConfigMod, 'isFirebaseAdminConfigured').mockReturnValue(true);
    vi.spyOn(firebaseConfigMod, 'resolveFirebaseAdminCredentials').mockReturnValue({
      projectId: 'sharon-demo-proj',
      clientEmail: 'fcm@sharon-demo-proj.iam.gserviceaccount.com',
      privateKey: '-----BEGIN PRIVATE KEY-----\nMOCK\n-----END PRIVATE KEY-----\n',
    });
    vi.mocked(firebaseAdminApp.getApps).mockReturnValue([{ name: 'mock' } as never]);
    const sendEachMock = vi.fn().mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true, messageId: 'msg-ok' }],
    });
    vi.mocked(firebaseAdminMessaging.getMessaging).mockReturnValue({
      sendEachForMulticast: sendEachMock,
    } as never);

    vi.spyOn(notificationRepo, 'findActiveStaffPushTokensForOutlet').mockResolvedValue([
      'staff-tok-12345678901234567890',
    ]);
    vi.spyOn(notificationRepo, 'findOutletNameByIdForPush').mockResolvedValue(
      'Sharon Indiranagar',
    );

    await notifyStaffNewOrder({
      outletId: 'out-ind-uuid',
      orderBusinessId: 'ORD2611120009',
      orderNumber: '#SH-IND-109',
      totalAmount: 75,
    });

    expect(sendEachMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ['staff-tok-12345678901234567890'],
        notification: {
          title: 'New Order #SH-IND-109',
          body: 'Sharon Indiranagar • INR 75.00',
        },
      }),
    );

    vi.spyOn(notificationRepo, 'findOrderContextForPush').mockResolvedValue({
      id: 'ord-9',
      business_id: 'ORD2611120009',
      outlet_id: 'out-ind-uuid',
      customer_id: 'cus-1',
      customer_phone: '9876543210',
      order_number: '#SH-IND-109',
    });
    vi.spyOn(notificationRepo, 'findActiveCustomerPushTokens').mockResolvedValue([
      'cust-tok-12345678901234567890',
    ]);

    await notifyCustomerOrderStatus({
      orderBusinessId: 'ORD2611120009',
      orderNumber: '#SH-IND-109',
      orderStatus: 'READY',
    });

    expect(sendEachMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        tokens: ['cust-tok-12345678901234567890'],
        notification: expect.objectContaining({
          title: 'Order #SH-IND-109 is Ready for Pickup!',
        }),
        data: expect.objectContaining({
          link: '/track/ORD2611120009',
          orderStatus: 'READY',
        }),
      }),
    );

    await notifyCustomerPaymentVerified({
      orderBusinessId: 'ORD2611120009',
      orderNumber: '#SH-IND-109',
      orderStatus: 'PREPARING',
    });

    expect(sendEachMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        tokens: ['cust-tok-12345678901234567890'],
        notification: expect.objectContaining({
          title: 'Payment Verified for #SH-IND-109',
        }),
      }),
    );
  });
});
