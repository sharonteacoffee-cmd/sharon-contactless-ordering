import http from 'node:http';
import type { AddressInfo } from 'node:net';
import jwt from 'jsonwebtoken';
import type { PoolClient } from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { authConfig } from '../src/config/auth.config';
import { integrationConfig } from '../src/config/integration.config';
import * as businessIdGen from '../src/database/businessIdGenerator';
import * as dbConnection from '../src/database/connection';
import * as menuSyncRepo from '../src/modules/menuSync/menuSync.repository';
import {
  previewMenuSyncFromWebsite,
  syncMenuFromWebsite,
} from '../src/modules/menuSync/menuSync.service';

describe('Menu Sync Preview & Duplicate-Free Sync (/api/v1/Private/MenuSync/*)', () => {
  let server: http.Server;
  let baseUrl: string;
  const realFetch = globalThis.fetch.bind(globalThis);

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
      return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
    });
  }

  function mockUpstreamCatalogFetch(productsPayload: unknown): void {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url === integrationConfig.mainWebsiteApiUrl) {
        return new Response(JSON.stringify({ data: productsPayload }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return realFetch(input, init);
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects OUTLET_STAFF with 403 on PreviewFromWebsite and SyncFromWebsite', async () => {
    mockAuthenticateAs('OUTLET_STAFF');

    const previewRes = await realFetch(`${baseUrl}/api/v1/Private/MenuSync/PreviewFromWebsite`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    expect(previewRes.status).toBe(403);

    const syncRes = await realFetch(`${baseUrl}/api/v1/Private/MenuSync/SyncFromWebsite`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${staffToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ syncMode: 'REPLACE_ALL' }),
    });
    expect(syncRes.status).toBe(403);
  });

  it('returns 422 on invalid syncMode in POST /SyncFromWebsite', async () => {
    mockAuthenticateAs('MD');

    const res = await realFetch(`${baseUrl}/api/v1/Private/MenuSync/SyncFromWebsite`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mdToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ syncMode: 'NUKE_EVERYTHING' }),
    });
    expect(res.status).toBe(422);
  });

  it('computes accurate preview diff including duplicates, price/image mismatches, new and stale items', async () => {
    mockUpstreamCatalogFetch([
      {
        id: 'ext-1',
        categorySlug: 'signature-chai',
        categoryName: 'Signature Chai',
        name: 'Sharon Special Dum Chai',
        slug: 'sharon-special-dum-chai',
        price: 25,
        imageUrl: 'https://cdn.sharonteastall.com/dum-chai-v2.webp',
      },
      // Duplicate upstream entry with same name/slug should be deduplicated before diffing
      {
        id: 'ext-1',
        categorySlug: 'signature-chai',
        categoryName: 'Signature Chai',
        name: 'Sharon Special Dum Chai',
        slug: 'sharon-special-dum-chai',
        price: 25,
        imageUrl: 'https://cdn.sharonteastall.com/dum-chai-v2.webp',
      },
      {
        id: 'ext-2',
        categorySlug: 'filter-coffee',
        categoryName: 'Filter Coffee',
        name: 'Madras Filter Coffee',
        slug: 'madras-filter-coffee',
        price: 30,
        imageUrl: 'https://cdn.sharonteastall.com/filter-coffee.webp',
      },
    ]);

    vi.spyOn(menuSyncRepo, 'findActiveLocalMenuItems').mockResolvedValue([
      {
        id: 'local-chai-survivor',
        external_main_id: 'ext-1',
        category_slug: 'signature-chai',
        name: 'Sharon Special Dum Chai',
        slug: 'sharon-special-dum-chai',
        description: null,
        price: '20.00',
        image_url: 'https://cdn.sharonteastall.com/dum-chai-v1.webp',
        is_vegetarian: true,
        is_bestseller: true,
        sort_order: 1,
        is_active: true,
        created_at: new Date('2026-11-10T08:00:00.000Z'),
      },
      {
        id: 'local-chai-dup',
        external_main_id: null,
        category_slug: 'signature-chai',
        name: '  sharon special dum chai ',
        slug: 'dum-chai-old-copy',
        description: null,
        price: '20.00',
        image_url: null,
        is_vegetarian: true,
        is_bestseller: false,
        sort_order: 2,
        is_active: true,
        created_at: new Date('2026-11-11T08:00:00.000Z'),
      },
      {
        id: 'local-stale-bun',
        external_main_id: null,
        category_slug: 'snacks-pairings',
        name: 'Bun Maska',
        slug: 'snacks-bun-maska',
        description: null,
        price: '35.00',
        image_url: null,
        is_vegetarian: true,
        is_bestseller: false,
        sort_order: 99,
        is_active: true,
        created_at: new Date('2026-11-09T08:00:00.000Z'),
      },
    ]);

    const preview = await previewMenuSyncFromWebsite();

    expect(preview.upstreamCount).toBe(2);
    expect(preview.categoriesCount).toBe(2);
    expect(preview.localTotalCount).toBe(3);
    expect(preview.matchedCount).toBe(1);
    expect(preview.newCount).toBe(1);
    expect(preview.mismatchCount).toBe(1);
    expect(preview.staleCount).toBe(1);
    expect(preview.duplicateCount).toBe(1);
    expect(preview.changedItems).toEqual([
      {
        localName: 'Sharon Special Dum Chai',
        upstreamName: 'Sharon Special Dum Chai',
        localSlug: 'sharon-special-dum-chai',
        upstreamSlug: 'sharon-special-dum-chai',
        localPrice: 20,
        upstreamPrice: 25,
        imageChanged: true,
        categorySlug: 'signature-chai',
      },
    ]);
    expect(preview.staleItems.map((s) => s.slug)).toEqual(['snacks-bun-maska']);
  });

  it('GET /PreviewFromWebsite returns MenuSyncPreviewResult for MD', async () => {
    mockAuthenticateAs('MD');
    mockUpstreamCatalogFetch([
      {
        id: 'ext-1',
        categorySlug: 'signature-chai',
        categoryName: 'Signature Chai',
        name: 'Sharon Special Dum Chai',
        slug: 'sharon-special-dum-chai',
        price: 25,
        imageUrl: null,
      },
    ]);
    vi.spyOn(menuSyncRepo, 'findActiveLocalMenuItems').mockResolvedValue([]);

    const res = await realFetch(`${baseUrl}/api/v1/Private/MenuSync/PreviewFromWebsite`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${mdToken}` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { upstreamCount: number; newCount: number };
    };
    expect(body.success).toBe(true);
    expect(body.data.upstreamCount).toBe(1);
    expect(body.data.newCount).toBe(1);
  });

  it('syncs in REPLACE_ALL mode: deduplicates duplicates, updates items, and deletes stale items', async () => {
    mockUpstreamCatalogFetch([
      {
        id: 'ext-1',
        categorySlug: 'signature-chai',
        categoryName: 'Signature Chai',
        name: 'Sharon Special Dum Chai',
        slug: 'sharon-special-dum-chai',
        price: 25,
        imageUrl: 'https://cdn.sharonteastall.com/dum-chai.webp',
      },
      {
        id: 'ext-2',
        categorySlug: 'filter-coffee',
        categoryName: 'Filter Coffee',
        name: 'Madras Filter Coffee',
        slug: 'madras-filter-coffee',
        price: 30,
        imageUrl: 'https://cdn.sharonteastall.com/filter-coffee.webp',
      },
    ]);

    const fakeClient = {} as PoolClient;
    vi.spyOn(dbConnection, 'withTransaction').mockImplementation(async (cb) => cb(fakeClient));
    vi.spyOn(menuSyncRepo, 'upsertMasterCategories').mockResolvedValue();
    vi.spyOn(menuSyncRepo, 'findMatchingLocalMenuItems').mockImplementation(async (_c, params) => {
      if (params.slug === 'sharon-special-dum-chai') {
        return [
          {
            id: 'survivor-chai-id',
            external_main_id: 'ext-1',
            category_slug: 'signature-chai',
            name: 'Sharon Special Dum Chai',
            slug: 'sharon-special-dum-chai',
            description: null,
            price: '20.00',
            image_url: null,
            is_vegetarian: true,
            is_bestseller: true,
            sort_order: 1,
            is_active: true,
            created_at: new Date('2026-11-10T08:00:00.000Z'),
          },
          {
            id: 'dup-chai-id',
            external_main_id: null,
            category_slug: 'signature-chai',
            name: 'Sharon Special Dum Chai',
            slug: 'sharon-special-dum-chai-dup',
            description: null,
            price: '18.00',
            image_url: null,
            is_vegetarian: true,
            is_bestseller: false,
            sort_order: 2,
            is_active: true,
            created_at: new Date('2026-11-11T08:00:00.000Z'),
          },
        ];
      }
      return [];
    });

    const mergeSpy = vi.spyOn(menuSyncRepo, 'mergeAndRemoveDuplicateMenuItem').mockResolvedValue();
    const updateSpy = vi.spyOn(menuSyncRepo, 'updateCanonicalMenuItem').mockResolvedValue();
    const insertSpy = vi
      .spyOn(menuSyncRepo, 'insertCanonicalMenuItem')
      .mockResolvedValue('inserted-coffee-id');
    const ensureOutletSpy = vi
      .spyOn(menuSyncRepo, 'ensureOutletMenuItemsForSyncedIds')
      .mockResolvedValue();
    const removeStaleSpy = vi
      .spyOn(menuSyncRepo, 'removeStaleMenuItemsAndCategories')
      .mockResolvedValue(3);
    vi.spyOn(businessIdGen, 'generateNextBusinessId').mockResolvedValue('SYNC2611120001');
    vi.spyOn(menuSyncRepo, 'insertMenuSyncLog').mockResolvedValue({
      created_at: new Date('2026-11-12T12:00:00.000Z'),
    });

    const result = await syncMenuFromWebsite(mdUserId, 'REPLACE_ALL');

    expect(mergeSpy).toHaveBeenCalledWith(fakeClient, 'survivor-chai-id', 'dup-chai-id');
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(ensureOutletSpy).toHaveBeenCalledWith(fakeClient, [
      'survivor-chai-id',
      'inserted-coffee-id',
    ]);
    expect(removeStaleSpy).toHaveBeenCalledWith(
      fakeClient,
      ['survivor-chai-id', 'inserted-coffee-id'],
      ['signature-chai', 'filter-coffee'],
    );
    expect(result).toEqual({
      syncBusinessId: 'SYNC2611120001',
      syncMode: 'REPLACE_ALL',
      itemsSynced: 2,
      categoriesSynced: 2,
      insertedCount: 1,
      updatedCount: 1,
      deletedCount: 3,
      deduplicatedCount: 1,
      sourceUrl: integrationConfig.mainWebsiteApiUrl,
      status: 'SUCCESS',
      syncedAt: '2026-11-12T12:00:00.000Z',
    });
  });

  it('syncs in KEEP_EXISTING mode without deleting non-upstream items', async () => {
    mockUpstreamCatalogFetch([
      {
        id: 'ext-1',
        categorySlug: 'signature-chai',
        categoryName: 'Signature Chai',
        name: 'Sharon Special Dum Chai',
        slug: 'sharon-special-dum-chai',
        price: 25,
        imageUrl: null,
      },
    ]);

    const fakeClient = {} as PoolClient;
    vi.spyOn(dbConnection, 'withTransaction').mockImplementation(async (cb) => cb(fakeClient));
    vi.spyOn(menuSyncRepo, 'upsertMasterCategories').mockResolvedValue();
    vi.spyOn(menuSyncRepo, 'findMatchingLocalMenuItems').mockResolvedValue([]);
    vi.spyOn(menuSyncRepo, 'insertCanonicalMenuItem').mockResolvedValue('inserted-chai-id');
    vi.spyOn(menuSyncRepo, 'ensureOutletMenuItemsForSyncedIds').mockResolvedValue();
    const removeStaleSpy = vi
      .spyOn(menuSyncRepo, 'removeStaleMenuItemsAndCategories')
      .mockResolvedValue(99);
    vi.spyOn(businessIdGen, 'generateNextBusinessId').mockResolvedValue('SYNC2611120002');
    vi.spyOn(menuSyncRepo, 'insertMenuSyncLog').mockResolvedValue({
      created_at: new Date('2026-11-12T12:05:00.000Z'),
    });

    const result = await syncMenuFromWebsite(mdUserId, 'KEEP_EXISTING');

    expect(removeStaleSpy).not.toHaveBeenCalled();
    expect(result.syncMode).toBe('KEEP_EXISTING');
    expect(result.deletedCount).toBe(0);
    expect(result.insertedCount).toBe(1);
  });
});
