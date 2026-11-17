import { Request, Response, NextFunction } from 'express';
import { catalogQuerySchema, productParamsSchema } from '../validators/catalog.js';
import { listCategories, listProducts, getProductBySlug } from '../services/catalog.service.js';
import { AppError } from '../utils/AppError.js';
import { getSettings } from '../models/Settings.js';
import { getPublicCatalogCache } from '../services/public-catalog-cache.service.js';

function sendPublicResponse(res: Response, payload: unknown, maxAgeSeconds = 60): void {
  // Public catalog responses have no user-specific data. Browsers and a CDN
  // may reuse them briefly; Express still supplies an ETag for conditional GETs.
  res.set('Cache-Control', `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds * 5}`);
  res.json(payload);
}

export async function getStoreSettings(_req: Request, res: Response, next: NextFunction) {
  try {
    const payload = await getPublicCatalogCache('store-settings', 60_000, async () => {
      const settings = await getSettings();
      return {
        success: true as const,
        data: {
          storeName: settings.storeName,
          logoUrl: settings.logoUrl,
          hero: {
            posterUrl: settings.hero?.posterUrl ?? '',
          },
          promoBanner: {
            image: settings.promoBanner?.image ?? '',
            isActive: settings.promoBanner?.isActive ?? false,
          },
          featuredCollection: {
            image: settings.featuredCollection?.image ?? '',
            link: settings.featuredCollection?.link ?? '/shop',
          },
          currency: settings.currency,
          deliveryFee: settings.deliveryFee,
          freeShippingThreshold: settings.freeShippingThreshold,
          shipping: settings.shipping,
          announcement: settings.announcement,
          contact: {
            phone: settings.contact?.phone ?? '',
            whatsapp: settings.contact?.whatsapp ?? '',
            email: settings.contact?.email ?? '',
          },
          social: {
            instagram: settings.social?.instagram ?? '',
            facebook: settings.social?.facebook ?? '',
            tiktok: settings.social?.tiktok ?? '',
          },
          instapay: settings.instapay?.enabled
            ? {
                enabled: true,
                identifier: settings.instapay.identifier ?? '',
                accountName: settings.instapay.accountName ?? '',
                instructions: settings.instapay.instructions ?? { ar: '', en: '' },
              }
            : { enabled: false, identifier: '', accountName: '', instructions: { ar: '', en: '' } },
        },
      };
    });
    sendPublicResponse(res, payload, 60);
  } catch (err) {
    next(err);
  }
}

export async function getCategories(_req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await listCategories();
    sendPublicResponse(res, { success: true, data: categories }, 300);
  } catch (err) {
    next(err);
  }
}

export async function getProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const query = catalogQuerySchema.parse(req.query);
    const result = await listProducts(query);
    sendPublicResponse(res, { success: true, data: result.items, meta: { page: result.page, limit: result.limit, total: result.total } });
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = productParamsSchema.parse(req.params);
    const product = await getProductBySlug(slug);
    if (!product) return next(AppError.notFound('Product not found'));
    sendPublicResponse(res, { success: true, data: product });
  } catch (err) {
    next(err);
  }
}
