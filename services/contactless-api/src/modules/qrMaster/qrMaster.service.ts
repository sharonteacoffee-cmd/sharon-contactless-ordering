import crypto from 'node:crypto';
import {
  toUTCISOString,
  type GenerateQrInput,
  type UpdateQrStatusInput,
} from '@sharon/shared';
import { appConfig } from '../../config/app.config';
import { generateNextBusinessId } from '../../database/businessIdGenerator';
import { withTransaction } from '../../database/connection';
import { AppError } from '../../utils/appError';
import { findOutletByBusinessId } from '../outletStock/outletStock.repository';
import {
  findAllQrCodes,
  findQrCodeByBusinessId,
  insertQrCode,
  updateQrStatusRow,
  type QrCodeJoinedRow,
} from './qrMaster.repository';

export interface QrCodeDto {
  businessId: string;
  outletBusinessId: string;
  outletName: string;
  outletSlug: string;
  qrToken: string;
  qrUrl: string;
  label: string;
  isActive: boolean;
  scansCount: number;
  createdAt: string;
  updatedAt: string;
}

function buildQrUrl(outletSlug: string, qrToken: string): string {
  return `${appConfig.orderAppUrl.replace(/\/$/, '')}/order/${outletSlug}?qr=${encodeURIComponent(qrToken)}`;
}

function toQrCodeDto(row: QrCodeJoinedRow): QrCodeDto {
  return {
    businessId: row.business_id,
    outletBusinessId: row.outlet_business_id,
    outletName: row.outlet_name,
    outletSlug: row.outlet_slug,
    qrToken: row.qr_token,
    qrUrl: buildQrUrl(row.outlet_slug, row.qr_token),
    label: row.label,
    isActive: row.is_active,
    scansCount: row.scans_count,
    createdAt: toUTCISOString(row.created_at),
    updatedAt: toUTCISOString(row.updated_at),
  };
}

export async function getAllQrCodes(outletBusinessId?: string): Promise<QrCodeDto[]> {
  const rows = await findAllQrCodes(outletBusinessId);
  return rows.map(toQrCodeDto);
}

export async function generateQrCode(input: GenerateQrInput): Promise<QrCodeDto> {
  const outlet = await findOutletByBusinessId(input.outletBusinessId);
  if (!outlet) {
    throw new AppError(404, 'OUTLET_NOT_FOUND', 'Outlet not found.');
  }

  const qrToken = `${outlet.slug}-${crypto.randomBytes(8).toString('hex')}`;
  const created = await withTransaction(async (client) => {
    const businessId = await generateNextBusinessId(client, 'QR');
    const inserted = await insertQrCode(client, {
      businessId,
      outletId: outlet.id,
      qrToken,
      label: input.label,
    });
    return { businessId, inserted };
  });

  return {
    businessId: created.businessId,
    outletBusinessId: outlet.business_id,
    outletName: outlet.name,
    outletSlug: outlet.slug,
    qrToken,
    qrUrl: buildQrUrl(outlet.slug, qrToken),
    label: input.label,
    isActive: true,
    scansCount: 0,
    createdAt: toUTCISOString(created.inserted.created_at),
    updatedAt: toUTCISOString(created.inserted.updated_at),
  };
}

export async function updateQrStatus(
  qrBusinessId: string,
  input: UpdateQrStatusInput,
): Promise<QrCodeDto> {
  const existing = await findQrCodeByBusinessId(qrBusinessId);
  if (!existing) {
    throw new AppError(404, 'QR_NOT_FOUND', 'QR standee record not found.');
  }

  const updated = await updateQrStatusRow({
    qrBusinessId,
    isActive: input.isActive,
    label: input.label,
  });

  return {
    ...toQrCodeDto(existing),
    isActive: input.isActive,
    label: input.label ?? existing.label,
    updatedAt: toUTCISOString(updated?.updated_at ?? new Date()),
  };
}
