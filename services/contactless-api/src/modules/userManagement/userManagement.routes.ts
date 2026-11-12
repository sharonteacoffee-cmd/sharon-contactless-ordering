import { Router } from 'express';
import { authenticateMiddleware } from '../../middleware/authenticate.middleware';
import { authorizeRoles } from '../../middleware/authorize.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import {
  handleCreateUser,
  handleGetUsers,
  handleToggleUserStatus,
  handleUpdateUser,
} from './userManagement.controller';
import {
  createUserSchema,
  toggleUserStatusSchema,
  updateUserSchema,
  userBusinessIdParamsSchema,
} from './userManagement.validator';

export const userManagementRouter: Router = Router();

userManagementRouter.use(authenticateMiddleware, authorizeRoles('MD'));

userManagementRouter.get('/GetUsers', handleGetUsers);

userManagementRouter.post(
  '/CreateUser',
  validateRequest({ body: createUserSchema }),
  handleCreateUser,
);

userManagementRouter.put(
  '/UpdateUser/:userBusinessId',
  validateRequest({
    params: userBusinessIdParamsSchema,
    body: updateUserSchema,
  }),
  handleUpdateUser,
);

userManagementRouter.patch(
  '/ToggleUserStatus/:userBusinessId',
  validateRequest({
    params: userBusinessIdParamsSchema,
    body: toggleUserStatusSchema,
  }),
  handleToggleUserStatus,
);
