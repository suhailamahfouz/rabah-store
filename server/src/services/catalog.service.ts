import { Category, Product } from '../models/index.js';
import mongoose from 'mongoose';
import { CatalogQuery } from '../validators/catalog.js';
import { getPublicCatalogCache } from './public-catalog-cache.service.js';

const CATALOG_CACHE_TTL_MS = 60_000;
const CATEGORY_CACHE_TTL_MS = 5 * 60_000;

const productProjection = {
  sku: 1,
  slug: 1,
  name: 1,
  description: 1,
  shortDescription: 1,
  price: 1,
  salePrice: 1,
  rating: 1,
  reviewCount: 1,
  stock: 1,
  createdAt: 1,
  category: 1,
  badge: 1,
  variants: 1,
  colorOptions: 1,
  images: 1,
  features: 1,
  isFeatured: 1,
  isBestSeller: 1,
} as const;

export interface ProductView {
  colorOptions: Array<{ hex: string; name: { ar: string; en: string } }>;
  id: string;
  sku: string;
  slug: string;
  name: { ar: string; en: string };
  description: { ar: string; en: string };
  shortDescription: { ar: string; en: string };
  price: number;
  originalPrice: number;
  salePrice?: number;
  rating: number;
  reviewCount: number;
  stock: number;
  createdAt: string;
  category: string;
  badge?: { ar: string; en: string };
  colors: string[];
  variants: Array<{
    id: string;
    color: { ar: string; en: string };
    hex?: string;
    stock: number;
  }>;
  images: string[];
  features: { ar: string; en: string }[];
  isFeatured: boolean;
  isBestSeller: boolean;
}

export interface CategoryView {
  id: string;
  slug: string;
  name: { ar: string; en: string };
  description: { ar: string; en: string };
  image?: string;
}

export function toProductView(doc: any): ProductView {
  const category = doc?.category ? String(doc.category?._id ?? doc.category) : '';
  const variants: ProductView['variants'] = Array.isArray(doc?.variants)
    ? doc.variants.map((variant: any) => ({
        id: String(variant?._id ?? ''),
        color: {
          ar: String(variant?.color?.name?.ar ?? ''),
          en: String(variant?.color?.name?.en ?? ''),
        },
        hex: variant?.color?.hex ? String(variant.color.hex) : undefined,
        stock: Number(variant?.stock ?? 0),
      })).filter((variant: ProductView['variants'][number]) => variant.id && (variant.color.ar || variant.color.en))
    : [];
  return {
    id: String(doc?._id ?? ''),
    colorOptions: (doc?.colorOptions ?? []).map((color: any) => ({ hex: String(color.hex).toUpperCase(), name: { ar: String(color.name.ar), en: String(color.name.en) } })),
    sku: String(doc?.sku ?? ''),
    slug: String(doc?.slug ?? ''),
    name: (doc?.name as { ar: string; en: string }) ?? { ar: '', en: '' },
    description: (doc?.description as { ar: string; en: string }) ?? { ar: '', en: '' },
    shortDescription: (doc?.shortDescription as { ar: string; en: string }) ?? { ar: '', en: '' },
    price: Number(doc?.salePrice ?? doc?.price ?? 0),
    originalPrice: Number(doc?.price ?? 0),
    salePrice: doc?.salePrice != null ? Number(doc.salePrice) : undefined,
    rating: Number(doc?.rating ?? 0),
    reviewCount: Number(doc?.reviewCount ?? 0),
    stock: variants.length ? variants.reduce((total, variant) => total + variant.stock, 0) : Number(doc?.stock ?? 0),
    createdAt: doc?.createdAt ? new Date(doc.createdAt).toISOString() : new Date(0).toISOString(),
    category,
    badge: doc?.badge as { ar: string; en: string } | undefined,
    colors: variants.map((variant) => variant.hex ?? (variant.color.ar || variant.color.en)),
    variants,
    images: Array.isArray(doc?.images) ? doc.images.map((item: any) => String(item?.url ?? '')) : [],
    features: Array.isArray(doc?.features) ? (doc.features as { ar: string; en: string }[]) : [],
    isFeatured: Boolean(doc?.isFeatured),
    isBestSeller: Boolean(doc?.isBestSeller),
  };
}

export function toCategoryView(doc: any): CategoryView {
  return {
    id: String(doc?._id ?? ''),
    slug: String(doc?.slug ?? ''),
    name: (doc?.name as { ar: string; en: string }) ?? { ar: '', en: '' },
    description: (doc?.description as { ar: string; en: string }) ?? { ar: '', en: '' },
    image: doc?.image ? String(doc.image) : undefined,
  };
}

export async function listCategories(): Promise<CategoryView[]> {
  return getPublicCatalogCache('categories', CATEGORY_CACHE_TTL_MS, async () => {
    const docs = await Category.find({ isActive: true })
      .select('slug name description image')
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();
    return docs.map(toCategoryView);
  });
}

export async function listProducts(query: CatalogQuery): Promise<{ items: ProductView[]; page: number; limit: number; total: number }> {
  const cacheKey = `products:${JSON.stringify(query)}`;
  return getPublicCatalogCache(cacheKey, CATALOG_CACHE_TTL_MS, async () => {
    const filter: Record<string, unknown> = { isActive: true, isDemo: { $ne: true } };
    if (query.ids) filter._id = { $in: query.ids.split(',').map(id => new mongoose.Types.ObjectId(id)) };

    if (query.category) {
      const cat = await Category.findOne({ slug: query.category, isActive: true }).select('_id').lean();
      if (!cat) return { items: [], page: query.page, limit: query.limit, total: 0 };
      filter.category = cat._id;
    }

    if (query.featured) filter.isFeatured = true;

    const pipeline: any[] = [{ $match: filter }];
    if (query.search) {
      pipeline.push({ $match: { $text: { $search: query.search } } });
    }
    pipeline.push({ $sort: { isBestSeller: -1, createdAt: -1 } });

    const skip = (query.page - 1) * query.limit;
    // $facet keeps the count and page read in one MongoDB round trip and one
    // matched result set, instead of repeating the entire catalog pipeline.
    const [result] = await Product.aggregate([
      ...pipeline,
      {
        $facet: {
          items: [{ $skip: skip }, { $limit: query.limit }, { $project: productProjection }],
          total: [{ $count: 'value' }],
        },
      },
    ] as any[]);
    const total = Number(result?.total?.[0]?.value ?? 0);
    const docs = Array.isArray(result?.items) ? result.items : [];

    return {
      items: docs.map((doc: any) => toProductView(doc)),
      page: query.page,
      limit: query.limit,
      total,
    };
  });
}

export async function getProductBySlug(slug: string): Promise<ProductView | null> {
  return getPublicCatalogCache(`product:slug:${slug}`, CATALOG_CACHE_TTL_MS, async () => {
    const doc = await Product.findOne({ slug, isActive: true, isDemo: { $ne: true } })
      .select(productProjection)
      .lean();
    return doc ? toProductView(doc) : null;
  });
}

export async function getProductById(id: string): Promise<ProductView | null> {
  return getPublicCatalogCache(`product:id:${id}`, CATALOG_CACHE_TTL_MS, async () => {
    const doc = await Product.findOne({ _id: id, isActive: true, isDemo: { $ne: true } })
      .select(productProjection)
      .lean();
    return doc ? toProductView(doc) : null;
  });
}
