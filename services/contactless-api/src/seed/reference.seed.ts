import argon2 from 'argon2';
import type { PoolClient } from 'pg';
import { generateNextBusinessId } from '../database/businessIdGenerator';
import { withTransaction } from '../database/connection';

const MODIFIER_GROUPS_SEED = [
  {
    name: 'Sugar Level',
    displayType: 'RADIO',
    isRequired: false,
    minSelection: 0,
    maxSelection: 1,
    sortOrder: 1,
    options: [
      { name: 'Normal Sugar', priceExtra: 0, isDefault: true, sortOrder: 1 },
      { name: 'Less Sugar', priceExtra: 0, isDefault: false, sortOrder: 2 },
      { name: 'No Sugar', priceExtra: 0, isDefault: false, sortOrder: 3 },
      { name: 'Organic Jaggery', priceExtra: 5, isDefault: false, sortOrder: 4 },
    ],
  },
  {
    name: 'Brew Strength',
    displayType: 'CHECKBOX',
    isRequired: false,
    minSelection: 0,
    maxSelection: 3,
    sortOrder: 2,
    options: [
      { name: 'Standard', priceExtra: 0, isDefault: true, sortOrder: 1 },
      { name: 'Kadak', priceExtra: 0, isDefault: false, sortOrder: 2 },
      { name: 'Extra Ginger', priceExtra: 5, isDefault: false, sortOrder: 3 },
      { name: 'Crushed Elaichi', priceExtra: 5, isDefault: false, sortOrder: 4 },
    ],
  },
] as const;

async function upsertModifierGroup(
  client: PoolClient,
  group: (typeof MODIFIER_GROUPS_SEED)[number],
): Promise<void> {
  const { rows: groupRows } = await client.query<{ id: string }>(
    `INSERT INTO modifier_groups (name, display_type, is_required, min_selection, max_selection, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (name) DO UPDATE
     SET display_type = EXCLUDED.display_type,
         is_required = EXCLUDED.is_required,
         min_selection = EXCLUDED.min_selection,
         max_selection = EXCLUDED.max_selection,
         sort_order = EXCLUDED.sort_order
     RETURNING id`,
    [
      group.name,
      group.displayType,
      group.isRequired,
      group.minSelection,
      group.maxSelection,
      group.sortOrder,
    ],
  );

  const groupId = groupRows[0].id;
  for (const option of group.options) {
    await client.query(
      `INSERT INTO modifier_options (group_id, name, price_extra, is_default, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (group_id, name) DO UPDATE
       SET price_extra = EXCLUDED.price_extra,
           is_default = EXCLUDED.is_default,
           sort_order = EXCLUDED.sort_order`,
      [groupId, option.name, option.priceExtra, option.isDefault, option.sortOrder],
    );
  }
}

export async function seedReferenceData(): Promise<void> {
  await withTransaction(async (client) => {
    // 1. Master beverage modifier groups & options
    for (const group of MODIFIER_GROUPS_SEED) {
      await upsertModifierGroup(client, group);
    }

    // 2. Bootstrap MD accounts strictly from environment variables (never hardcoded)
    const bootstrapMdAccounts = [
      {
        email: process.env.MD_SEED_EMAIL?.trim().toLowerCase(),
        password: process.env.MD_SEED_PASSWORD,
        fullName: 'Managing Director',
        label: 'primary MD',
      },
      {
        email: process.env.NOVACODEX_MD_EMAIL?.trim().toLowerCase(),
        password: process.env.NOVACODEX_MD_PASSWORD,
        fullName: 'Platform Admin',
        label: 'platform admin MD',
      },
    ];

    for (const account of bootstrapMdAccounts) {
      if (!account.email || !account.password) {
        if (account.label === 'primary MD') {
          console.warn(
            '[seed:reference] MD_SEED_EMAIL or MD_SEED_PASSWORD not set; skipping primary MD account.',
          );
        }
        continue;
      }

      const businessId = await generateNextBusinessId(client, 'USR');
      const passwordHash = await argon2.hash(account.password, { type: argon2.argon2id });

      await client.query(
        `INSERT INTO users (business_id, email, password_hash, full_name, role, outlet_id, is_active)
         VALUES ($1, $2, $3, $4, 'MD', NULL, true)
         ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             role = 'MD',
             is_active = true,
             updated_at = CURRENT_TIMESTAMP`,
        [businessId, account.email, passwordHash, account.fullName],
      );
      console.log(`[seed:reference] Upserted ${account.label} bootstrap user (${account.email}).`);
    }
  });
}
