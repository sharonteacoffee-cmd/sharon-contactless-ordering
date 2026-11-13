import { Router } from 'express';
import { authenticateMiddleware } from '../../middleware/authenticate.middleware';
import { authorizeRoles } from '../../middleware/authorize.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import {
  handleCreateProduct,
  handleDeleteProduct,
  handleGetCategories,
  handleGetProducts,
  handleUpdateProduct,
} from './product.controller';
import {
  createProductRequestSchema,
  productIdParamsSchema,
  updateProductRequestSchema,
} from './product.validator';

export const productRouter: Router = Router();

// Staff and MD can read categories and products
productRouter.use(authenticateMiddleware);

productRouter.get(
  '/GetCategories',
  authorizeRoles('MD', 'OUTLET_STAFF'),
  handleGetCategories,
);

productRouter.get(
  '/GetProducts',
  authorizeRoles('MD', 'OUTLET_STAFF'),
  handleGetProducts,
);

// MD only for modifications
productRouter.post(
  '/CreateProduct',
  authorizeRoles('MD'),
  validateRequest({
    body: createProductRequestSchema,
  }),
  handleCreateProduct,
);

productRouter.put(
  '/UpdateProduct/:productId',
  authorizeRoles('MD'),
  validateRequest({
    params: productIdParamsSchema,
    body: updateProductRequestSchema,
  }),
  handleUpdateProduct,
);

productRouter.delete(
  '/DeleteProduct/:productId',
  authorizeRoles('MD'),
  validateRequest({
    params: productIdParamsSchema,
  }),
  handleDeleteProduct,
);
