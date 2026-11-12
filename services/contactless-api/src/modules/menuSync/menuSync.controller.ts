import type { SyncFromWebsiteInput } from '@sharon/shared';
import type { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../utils/apiResponse';
import { AppError } from '../../utils/appError';
import {
  getMenuSyncLogs,
  previewMenuSyncFromWebsite,
  syncMenuFromWebsite,
} from './menuSync.service';

export async function handlePreviewFromWebsite(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const preview = await previewMenuSyncFromWebsite();
    sendSuccess(res, 200, 'Menu sync preview fetched successfully', preview);
  } catch (err) {
    next(err);
  }
}

export async function handleSyncFromWebsite(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required.');
    }
    const { syncMode } = (req.body ?? {}) as SyncFromWebsiteInput;
    const result = await syncMenuFromWebsite(req.user.userId, syncMode ?? 'REPLACE_ALL');
    sendSuccess(res, 200, `Synced ${result.itemsSynced} items from website catalog`, result);
  } catch (err) {
    next(err);
  }
}

export async function handleGetSyncLogs(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const logs = await getMenuSyncLogs();
    sendSuccess(res, 200, 'Menu sync logs fetched successfully', logs);
  } catch (err) {
    next(err);
  }
}
