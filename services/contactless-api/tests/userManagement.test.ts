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
import * as userManagementRepo from '../src/modules/userManagement/userManagement.repository';

describe('MD Outlet User Management (/api/v1/Private/User/*)', () => {
  let server: http.Server;
  let baseUrl: string;

  const mdUserId = 'usr-md-uuid';
  const mdToken = jwt.sign(
    {
      userId: mdUserId,
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

  function mockAuthenticateAs(role: 'MD' | 'OUTLET_STAFF'): void {
    vi.spyOn(dbConnection, 'query').mockImplementation(async (sql) => {
      if (typeof sql === 'string' && sql.includes('FROM users u')) {
        if (role === 'MD') {
          return {
            rows: [
              {
                id: mdUserId,
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
      throw new Error(`Unexpected SQL in auth mock: ${sql}`);
    });
  }

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

  it('GET /GetUsers excludes @novacodex.in users and never leaks password_hash', async () => {
    mockAuthenticateAs('MD');
    vi.spyOn(userManagementRepo, 'findAllManagedUsers').mockResolvedValueOnce([
      {
        id: 'usr-1',
        business_id: 'USR2611120002',
        email: 'indiranagar@sharonteastall.com',
        full_name: 'Indiranagar Counter Staff',
        role: 'OUTLET_STAFF',
        outlet_id: 'out-1',
        outlet_business_id: 'OUT2611120001',
        outlet_name: 'Sharon Indiranagar Flagship',
        is_active: true,
        created_at: new Date('2026-11-12T10:00:00.000Z'),
        updated_at: new Date('2026-11-12T10:00:00.000Z'),
      },
      {
        id: 'usr-hidden',
        business_id: 'USR2611120099',
        email: 'ops@novacodex.in',
        full_name: 'Platform Admin',
        role: 'MD',
        outlet_id: null,
        outlet_business_id: null,
        outlet_name: null,
        is_active: true,
        created_at: new Date('2026-11-12T10:00:00.000Z'),
        updated_at: new Date('2026-11-12T10:00:00.000Z'),
      },
    ]);

    const res = await fetch(`${baseUrl}/api/v1/Private/User/GetUsers`, {
      headers: { Authorization: `Bearer ${mdToken}` },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      success: boolean;
      data: Array<Record<string, unknown>>;
    };

    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].email).toBe('indiranagar@sharonteastall.com');
    expect(json.data[0].passwordHash).toBeUndefined();
    expect(json.data[0].password_hash).toBeUndefined();
  });

  it('PUT /UpdateUser and PATCH /ToggleUserStatus return 404 for @novacodex.in accounts and 409 when disabling self', async () => {
    mockAuthenticateAs('MD');
    vi.spyOn(userManagementRepo, 'findManagedUserByBusinessId')
      .mockResolvedValueOnce({
        id: 'usr-hidden',
        business_id: 'USR2611120099',
        email: 'admin@novacodex.in',
        full_name: 'Platform Admin',
        role: 'MD',
        outlet_id: null,
        outlet_business_id: null,
        outlet_name: null,
        is_active: true,
        created_at: new Date('2026-11-12T10:00:00.000Z'),
        updated_at: new Date('2026-11-12T10:00:00.000Z'),
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: mdUserId,
        business_id: 'USR2611120001',
        email: 'md@sharonteastall.com',
        full_name: 'Managing Director',
        role: 'MD',
        outlet_id: null,
        outlet_business_id: null,
        outlet_name: null,
        is_active: true,
        created_at: new Date('2026-11-12T10:00:00.000Z'),
        updated_at: new Date('2026-11-12T10:00:00.000Z'),
      });

    const updateHiddenRes = await fetch(
      `${baseUrl}/api/v1/Private/User/UpdateUser/USR2611120099`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${mdToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fullName: 'Changed Name' }),
      },
    );
    expect(updateHiddenRes.status).toBe(404);

    const toggleHiddenRes = await fetch(
      `${baseUrl}/api/v1/Private/User/ToggleUserStatus/USR2611120099`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${mdToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: false }),
      },
    );
    expect(toggleHiddenRes.status).toBe(404);

    const selfDisableRes = await fetch(
      `${baseUrl}/api/v1/Private/User/ToggleUserStatus/USR2611120001`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${mdToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: false }),
      },
    );
    expect(selfDisableRes.status).toBe(409);
    const selfJson = (await selfDisableRes.json()) as { error: { code: string } };
    expect(selfJson.error.code).toBe('CANNOT_DISABLE_SELF');
  });

  it('POST /CreateUser blocks @novacodex.in with 403 and creates valid outlet staff with 201', async () => {
    mockAuthenticateAs('MD');

    const forbiddenRes = await fetch(`${baseUrl}/api/v1/Private/User/CreateUser`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mdToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'dev@novacodex.in',
        fullName: 'Internal User',
        password: 'StrongPassword123',
        role: 'MD',
      }),
    });
    expect(forbiddenRes.status).toBe(403);

    vi.spyOn(userManagementRepo, 'findUserByEmail').mockResolvedValueOnce(null);
    vi.spyOn(outletStockRepo, 'findOutletByBusinessId').mockResolvedValueOnce({
      id: 'out-ind-uuid',
      business_id: 'OUT2611120001',
      slug: 'indiranagar',
      name: 'Sharon Indiranagar Flagship',
    });
    vi.spyOn(dbConnection, 'withTransaction').mockImplementationOnce(
      async (fn) => fn({} as PoolClient),
    );
    vi.spyOn(businessIdGen, 'generateNextBusinessId').mockResolvedValueOnce('USR2611120010');
    vi.spyOn(userManagementRepo, 'insertManagedUser').mockResolvedValueOnce({
      id: 'new-usr-uuid',
      created_at: new Date('2026-11-12T11:00:00.000Z'),
      updated_at: new Date('2026-11-12T11:00:00.000Z'),
    });

    const okRes = await fetch(`${baseUrl}/api/v1/Private/User/CreateUser`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mdToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'barista.ind@sharonteastall.com',
        fullName: 'Indiranagar Barista',
        password: 'StrongPassword123',
        role: 'OUTLET_STAFF',
        outletBusinessId: 'OUT2611120001',
      }),
    });
    expect(okRes.status).toBe(201);
    const okJson = (await okRes.json()) as {
      success: boolean;
      data: { businessId: string; email: string; outletBusinessId: string };
    };
    expect(okJson.success).toBe(true);
    expect(okJson.data.businessId).toBe('USR2611120010');
    expect(okJson.data.email).toBe('barista.ind@sharonteastall.com');
    expect(okJson.data.outletBusinessId).toBe('OUT2611120001');
  });

  it('blocks OUTLET_STAFF with 403 on /api/v1/Private/User/*', async () => {
    mockAuthenticateAs('OUTLET_STAFF');

    const getRes = await fetch(`${baseUrl}/api/v1/Private/User/GetUsers`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    expect(getRes.status).toBe(403);

    const createRes = await fetch(`${baseUrl}/api/v1/Private/User/CreateUser`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${staffToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'x@sharonteastall.com',
        fullName: 'Staff X',
        password: 'StrongPassword123',
        role: 'OUTLET_STAFF',
        outletBusinessId: 'OUT2611120001',
      }),
    });
    expect(createRes.status).toBe(403);
  });
});
