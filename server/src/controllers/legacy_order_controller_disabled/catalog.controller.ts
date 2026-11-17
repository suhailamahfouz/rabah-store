import { Request, Response, NextFunction } from 'express';
import { catalogQuerySchema, productParamsSchema } from '../../validators/catalog.js';
import { listCategories, listProducts, getProductBySlug } from '../../services/catalog.service.js';
import { AppError } from '../../utils/AppError.js';

export async function getCategories(_req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await listCategories();
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
}

export async function getProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const query = catalogQuerySchema.parse(req.query);
    const result = await listProducts(query);
    res.json({ success: true, data: result.items, meta: { page: result.page, limit: result.limit, total: result.total } });
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = productParamsSchema.parse(req.params);
    const product = await getProductBySlug(slug);
    if (!product) return next(AppError.notFound('Product not found'));
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}