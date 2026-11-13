import type { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../utils/apiResponse';
import {
  createProduct,
  deleteProduct,
  getCategories,
  getProducts,
  updateProduct,
} from './product.service';
import type { CreateProductRequest, UpdateProductRequest } from './product.validator';

export async function handleGetCategories(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const categories = await getCategories();
    sendSuccess(res, 200, 'Categories fetched successfully', categories);
  } catch (err) {
    next(err);
  }
}

export async function handleGetProducts(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const categorySlug =
      typeof req.query.categorySlug === 'string'
        ? req.query.categorySlug
        : undefined;
    const search =
      typeof req.query.search === 'string' ? req.query.search : undefined;

    const products = await getProducts({ categorySlug, search });
    sendSuccess(res, 200, 'Products fetched successfully', products);
  } catch (err) {
    next(err);
  }
}

export async function handleCreateProduct(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as CreateProductRequest;
    const product = await createProduct(body);
    sendSuccess(res, 201, 'Product created successfully', product);
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateProduct(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as UpdateProductRequest;
    const product = await updateProduct(req.params.productId, body);
    sendSuccess(res, 200, 'Product updated successfully', product);
  } catch (err) {
    next(err);
  }
}

export async function handleDeleteProduct(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await deleteProduct(req.params.productId);
    sendSuccess(
      res,
      200,
      result.deleted
        ? 'Product deleted successfully'
        : 'Product deactivated successfully',
      result,
    );
  } catch (err) {
    next(err);
  }
}
