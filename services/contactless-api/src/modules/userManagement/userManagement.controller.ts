import type { NextFunction, Request, Response } from 'express';
import type {
  CreateUserInput,
  ToggleUserStatusInput,
  UpdateUserInput,
} from '@sharon/shared';
import { sendSuccess } from '../../utils/apiResponse';
import { AppError } from '../../utils/appError';
import {
  createManagedUser,
  getManagedUsers,
  toggleManagedUserStatus,
  updateManagedUser,
} from './userManagement.service';

export async function handleGetUsers(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const users = await getManagedUsers();
    sendSuccess(res, 200, 'Outlet users fetched successfully', users);
  } catch (err) {
    next(err);
  }
}

export async function handleCreateUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as CreateUserInput;
    const created = await createManagedUser(body);
    sendSuccess(res, 201, 'Outlet user created successfully', created);
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required.');
    }
    const body = req.body as UpdateUserInput;
    const updated = await updateManagedUser(
      req.user,
      req.params.userBusinessId,
      body,
    );
    sendSuccess(res, 200, 'Outlet user updated successfully', updated);
  } catch (err) {
    next(err);
  }
}

export async function handleToggleUserStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required.');
    }
    const body = req.body as ToggleUserStatusInput;
    const updated = await toggleManagedUserStatus(
      req.user,
      req.params.userBusinessId,
      body,
    );
    sendSuccess(res, 200, 'User status updated successfully', updated);
  } catch (err) {
    next(err);
  }
}
