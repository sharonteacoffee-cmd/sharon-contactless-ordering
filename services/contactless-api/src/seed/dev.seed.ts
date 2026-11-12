import crypto from 'node:crypto';
import argon2 from 'argon2';
import { generateNextBusinessId } from '../database/businessIdGenerator';
import { withTransaction } from '../database/connection';

const DEV_OUTLETS = [
  {
    name: 'Sharon Indiranagar Flagship',
    slug: 'indiranagar',
    address: '100ft Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038',
    phone: '+91 99169 99209',
    operatingHours: '6:00 AM - 11:00 PM',
    upiVpa: 'paytm.s211ne7@pty',
    upiPayeeName: 'MUNISWAMY JOSHVA',
    staffEmail: 'indiranagar@sharonteastall.com',
    staffName: 'Indiranagar Counter Staff',
    qrLabel: 'Counter Standee #1',
  },
  {
    name: 'Sharon New Thippasandra',
    slug: 'new-thippasandra',
    address: '80ft Road, New Thippasandra, Bengaluru, Karnataka 560075',
    phone: '+91 99169 99209',
    operatingHours: '6:30 AM - 10:30 PM',
    upiVpa: 'paytm.s211ne7@pty',
    upiPayeeName: 'MUNISWAMY JOSHVA',
    staffEmail: 'thippasandra@sharonteastall.com',
    staffName: 'Thippasandra Counter Staff',
    qrLabel: 'Main Counter Standee',
  },
  {
    name: 'Sharon Kaggadasapura',
    slug: 'kaggadasapura',
    address: 'Main Road, Kaggadasapura, C V Raman Nagar, Bengaluru, Karnataka 560093',
    phone: '+91 99169 99209',
    operatingHours: '6:30 AM - 10:30 PM',
    upiVpa: 'paytm.s211ne7@pty',
    upiPayeeName: 'MUNISWAMY JOSHVA',
    staffEmail: 'kaggadasapura@sharonteastall.com',
    staffName: 'Kaggadasapura Counter Staff',
    qrLabel: 'Main Counter Standee',
  },
] as const;

export async function seedDevelopmentData(): Promise<void> {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error(
      'SECURITY BLOCK: dev.seed.ts can only run when NODE_ENV === "development".',
    );
  }

  const configuredDevPassword = process.env.DEV_STAFF_SEED_PASSWORD?.trim();
  const generatedDevPassword = configuredDevPassword
    ? null
    : crypto.randomBytes(12).toString('base64url');
  const devPassword = configuredDevPassword ?? generatedDevPassword!;
  const passwordHash = await argon2.hash(devPassword, { type: argon2.argon2id });

  await withTransaction(async (client) => {
    for (const outlet of DEV_OUTLETS) {
      const existingOutlet = await client.query<{ id: string }>(
        'SELECT id FROM outlets WHERE slug = $1',
        [outlet.slug],
      );

      let outletId: string;
      if (existingOutlet.rows.length > 0) {
        outletId = existingOutlet.rows[0].id;
      } else {
        const outletBusinessId = await generateNextBusinessId(client, 'OUT');
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO outlets (
             business_id, name, slug, address, phone, operating_hours,
             is_active, is_ordering_enabled, customer_auth_mode,
             require_customer_phone, require_customer_name,
             payment_provider, demo_auto_verify_payment, upi_vpa, upi_payee_name,
             estimated_prep_time_minutes
           )
           VALUES ($1, $2, $3, $4, $5, $6, true, true, 'DIRECT_GUEST', true, true,
                   'DEMO_UPI_INTENT', false, $7, $8, 5)
           RETURNING id`,
          [
            outletBusinessId,
            outlet.name,
            outlet.slug,
            outlet.address,
            outlet.phone,
            outlet.operatingHours,
            outlet.upiVpa,
            outlet.upiPayeeName,
          ],
        );
        outletId = inserted.rows[0].id;
      }

      // Seed initial QR code if outlet has none
      const existingQr = await client.query<{ id: string }>(
        'SELECT id FROM outlet_qr_codes WHERE outlet_id = $1 LIMIT 1',
        [outletId],
      );
      if (existingQr.rows.length === 0) {
        const qrBusinessId = await generateNextBusinessId(client, 'QR');
        const qrToken = `${outlet.slug}-${crypto.randomBytes(6).toString('hex')}`;
        await client.query(
          `INSERT INTO outlet_qr_codes (business_id, outlet_id, qr_token, label, is_active)
           VALUES ($1, $2, $3, $4, true)`,
          [qrBusinessId, outletId, qrToken, outlet.qrLabel],
        );
      }

      // Upsert dev staff user for outlet
      const userBusinessId = await generateNextBusinessId(client, 'USR');
      await client.query(
        `INSERT INTO users (business_id, email, password_hash, full_name, role, outlet_id, is_active)
         VALUES ($1, $2, $3, $4, 'OUTLET_STAFF', $5, true)
         ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             role = 'OUTLET_STAFF',
             outlet_id = EXCLUDED.outlet_id,
             is_active = true,
             updated_at = CURRENT_TIMESTAMP`,
        [userBusinessId, outlet.staffEmail, passwordHash, outlet.staffName, outletId],
      );

      if (outlet.slug === 'indiranagar') {
        const hiddenStaffEmail = process.env.NOVACODEX_STAFF_EMAIL?.trim().toLowerCase();
        const hiddenStaffPassword = process.env.NOVACODEX_STAFF_PASSWORD;
        if (hiddenStaffEmail && hiddenStaffPassword) {
          const hiddenStaffBusinessId = await generateNextBusinessId(client, 'USR');
          const hiddenStaffHash = await argon2.hash(hiddenStaffPassword, {
            type: argon2.argon2id,
          });
          await client.query(
            `INSERT INTO users (business_id, email, password_hash, full_name, role, outlet_id, is_active)
             VALUES ($1, $2, $3, $4, 'OUTLET_STAFF', $5, true)
             ON CONFLICT (email) DO UPDATE
             SET password_hash = EXCLUDED.password_hash,
                 role = 'OUTLET_STAFF',
                 outlet_id = EXCLUDED.outlet_id,
                 is_active = true,
                 updated_at = CURRENT_TIMESTAMP`,
            [
              hiddenStaffBusinessId,
              hiddenStaffEmail,
              hiddenStaffHash,
              'Flagship Support Staff',
              outletId,
            ],
          );
        }
      }
    }

    // Link all existing menu items to all seeded outlets
    await client.query(
      `INSERT INTO outlet_menu_items (outlet_id, menu_item_id, is_available)
       SELECT o.id, mi.id, true
       FROM outlets o
       CROSS JOIN menu_items mi
       ON CONFLICT (outlet_id, menu_item_id) DO NOTHING`,
    );
  });

  if (generatedDevPassword) {
    console.log(
      `[seed:dev] Generated ephemeral dev staff password for newly seeded staff accounts: ${generatedDevPassword}`,
    );
  }
  console.log('[seed:dev] Seeded 3 Bengaluru outlets, QR tokens, and dev staff accounts.');
}
