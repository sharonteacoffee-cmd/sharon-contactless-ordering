import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function extractCreateTables(sql: string): Map<string, string[]> {
  const tables = new Map<string, string[]>();
  const tableRegex = /CREATE TABLE IF NOT EXISTS\s+([a-z_]+)\s*\(([\s\S]*?)\);/gi;
  let match: RegExpExecArray | null;

  while ((match = tableRegex.exec(sql)) !== null) {
    const tableName = match[1];
    const body = match[2];
    const columns = body
      .split('\n')
      .map((line) => line.trim())
      .filter(
        (line) =>
          line.length > 0 &&
          !line.startsWith('--') &&
          !line.startsWith('CONSTRAINT') &&
          !line.startsWith('PRIMARY KEY') &&
          !line.startsWith('UNIQUE'),
      )
      .map((line) => line.split(/\s+/)[0].toLowerCase());

    tables.set(tableName, columns);
  }

  return tables;
}

function extractSequences(sql: string): string[] {
  const sequences: string[] = [];
  const seqRegex = /CREATE SEQUENCE IF NOT EXISTS\s+([a-z_]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = seqRegex.exec(sql)) !== null) {
    sequences.push(match[1].toLowerCase());
  }
  return sequences.sort();
}

function extractAlterAddColumns(sql: string): Array<{ table: string; column: string }> {
  const alters: Array<{ table: string; column: string }> = [];
  const alterRegex =
    /ALTER TABLE\s+([a-z_]+)\s+ADD COLUMN IF NOT EXISTS\s+([a-z_]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = alterRegex.exec(sql)) !== null) {
    alters.push({
      table: match[1].toLowerCase(),
      column: match[2].toLowerCase(),
    });
  }
  return alters;
}

describe('Schema Parity (schema.production.sql vs schema.development.sql)', () => {
  const dbDir = path.resolve(__dirname, '../src/database');
  const prodSql = fs.readFileSync(path.join(dbDir, 'schema.production.sql'), 'utf-8');
  const devSql = fs.readFileSync(path.join(dbDir, 'schema.development.sql'), 'utf-8');

  it('keeps production schema free of ALTER TABLE statements', () => {
    expect(prodSql).not.toMatch(/\bALTER\s+TABLE\b/i);
  });

  it('defines identical sequences in production and development schemas', () => {
    const prodSeqs = extractSequences(prodSql);
    const devSeqs = extractSequences(devSql);

    expect(prodSeqs).toEqual([
      'seq_customer_business_id',
      'seq_menu_sync_business_id',
      'seq_order_business_id',
      'seq_outlet_business_id',
      'seq_payment_txn_business_id',
      'seq_push_token_business_id',
      'seq_qr_business_id',
      'seq_user_business_id',
    ]);
    expect(devSeqs).toEqual(prodSeqs);
  });

  it('has 100% identical tables and columns in schema.production.sql and schema.development.sql', () => {
    const prodTables = extractCreateTables(prodSql);
    const devTables = extractCreateTables(devSql);

    expect(Array.from(prodTables.keys()).sort()).toEqual(
      Array.from(devTables.keys()).sort(),
    );

    expect(prodTables.has('outlet_order_counters')).toBe(true);
    expect(prodTables.has('customers')).toBe(true);
    expect(prodTables.has('push_notification_tokens')).toBe(true);
    expect(prodSql).toContain('idx_push_tokens_staff_outlet');
    expect(prodSql).toContain('idx_push_tokens_customer');
    expect(devSql).toContain('idx_push_tokens_staff_outlet');
    expect(devSql).toContain('idx_push_tokens_customer');
    expect(prodTables.get('orders')).toContain('customer_id');

    for (const [tableName, prodCols] of prodTables.entries()) {
      expect(devTables.get(tableName)).toEqual(prodCols);
    }
  });

  it('ensures every ALTER TABLE ADD COLUMN in schema.development.sql is mirrored in schema.production.sql', () => {
    const prodTables = extractCreateTables(prodSql);
    const devAlters = extractAlterAddColumns(devSql);

    expect(devAlters.length).toBeGreaterThan(0);
    for (const { table, column } of devAlters) {
      const prodCols = prodTables.get(table);
      expect(prodCols).toBeDefined();
      expect(prodCols).toContain(column);
    }
  });

  it('enforces TIMESTAMPTZ (no bare TIMESTAMP without time zone)', () => {
    const withoutTimestamptz = prodSql.replace(/TIMESTAMPTZ/gi, '');
    expect(withoutTimestamptz).not.toMatch(/\bTIMESTAMP\b/i);
  });
});
