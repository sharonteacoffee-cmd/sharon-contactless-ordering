import type { OutletPublicInfo } from '@sharon/shared';
import { AppError } from '../../utils/appError';
import { toPublicOutletDto } from './publicOutlet.dto';
import {
  findActivePublicOutlets,
  findOutletBySlug,
  recordQrScanIfValid,
} from './publicOutlet.repository';

export async function getPublicOutlets(): Promise<OutletPublicInfo[]> {
  const rows = await findActivePublicOutlets();
  return rows.map(toPublicOutletDto);
}

export async function getPublicOutletBySlug(
  outletSlug: string,
  qrToken?: string,
): Promise<OutletPublicInfo> {
  const outlet = await findOutletBySlug(outletSlug);
  if (!outlet) {
    throw new AppError(404, 'OUTLET_NOT_FOUND', 'Outlet not found.');
  }

  if (qrToken && qrToken.trim().length > 0) {
    const qrStatus = await recordQrScanIfValid(outlet.id, qrToken.trim());
    if (qrStatus === 'INVALID_OR_DISABLED') {
      throw new AppError(
        404,
        'QR_DISABLED_OR_INVALID',
        'This QR code is invalid or has been disabled. Please scan the latest counter QR.',
      );
    }
  }

  return toPublicOutletDto(outlet);
}
