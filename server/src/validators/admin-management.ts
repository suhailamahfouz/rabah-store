import { z } from 'zod';

function isSafeAssetUrl(value: string): boolean {
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const assetUrl = z.string().trim().min(1).max(2000).refine(isSafeAssetUrl, 'Use an HTTP(S) URL or a local absolute path');
const externalUrl = z.string().trim().max(500).refine((value) => !value || /^https?:\/\/\S+$/i.test(value), 'Use an HTTP(S) URL');
const cloudinaryPublicId = z.string().trim().max(500)
  .regex(/^rabah-store\/(products|categories|branding|banners)\/asset-[0-9a-f-]{36}$/i, 'Invalid image storage id');
// The dashboard serializes an empty optional field as an empty string. Treat
// that as absent while continuing to validate every non-empty public id.
const optionalCloudinaryPublicId = z.union([cloudinaryPublicId, z.literal('')]).optional()
  .transform((value) => value || undefined);

const bilingual = z.object({
  ar: z.string().trim().max(4000).default(''),
  en: z.string().trim().max(4000).default(''),
});

const productVariantSchema = z.object({
  color: z.object({
    name: z.object({
      ar: z.string().trim().min(1).max(60),
      en: z.string().trim().min(1).max(60),
    }),
    hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a six-digit hex color').optional(),
  }),
  stock: z.number().int().nonnegative(),
}).strict();

function hasDuplicateVariantColors(variants: z.infer<typeof productVariantSchema>[]): boolean {
  const keys = variants.map((variant) =>
    (variant.color.hex ?? `${variant.color.name.ar}|${variant.color.name.en}`).trim().toLowerCase(),
  );
  return new Set(keys).size !== keys.length;
}

const productShape = {
  sku: z.string().trim().min(1).max(40),
  slug: z.string().trim().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.object({ ar: z.string().trim().min(1).max(200), en: z.string().trim().min(1).max(200) }),
  description: bilingual,
  shortDescription: z.object({ ar: z.string().trim().max(200).default(''), en: z.string().trim().max(200).default('') }).default({ ar: '', en: '' }),
  category: z.string().trim().min(1),
  price: z.number().nonnegative(),
  salePrice: z.number().nonnegative().nullable().optional(),
  stock: z.number().int().nonnegative(),
  variants: z.array(productVariantSchema).max(0, 'Color variants are no longer supported; use general stock').default([]),
  images: z.array(z.object({
    url: assetUrl,
    publicId: optionalCloudinaryPublicId,
    alt: z.string().trim().max(200).default(''),
  })).max(20).default([]),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
};

const adminProductSchema = z.object(productShape).strict();

export const adminProductCreateSchema = adminProductSchema
  .refine((value) => value.salePrice == null || value.salePrice < value.price, {
    path: ['salePrice'], message: 'Sale price must be lower than the regular price',
  })
  .refine((value) => !hasDuplicateVariantColors(value.variants), {
    path: ['variants'], message: 'Each color can appear only once per product',
  });

// Creation defaults must never be applied to a PATCH: omitted images/colors
// and flags mean "keep the saved value", not an empty list or a default flag.
export const adminProductUpdateSchema = adminProductSchema.partial().extend({
  shortDescription: productShape.shortDescription.removeDefault().optional(),
  variants: productShape.variants.removeDefault().optional(),
  images: productShape.images.removeDefault().optional(),
  isActive: productShape.isActive.removeDefault().optional(),
  isFeatured: productShape.isFeatured.removeDefault().optional(),
  isBestSeller: productShape.isBestSeller.removeDefault().optional(),
})
  .refine((value) => value.salePrice == null || value.price == null || value.salePrice < value.price, {
    path: ['salePrice'], message: 'Sale price must be lower than the regular price',
  })
  .refine((value) => !value.variants || !hasDuplicateVariantColors(value.variants), {
    path: ['variants'], message: 'Each color can appear only once per product',
  });

export const adminCategoryCreateSchema = z.object({
  slug: z.string().trim().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.object({ ar: z.string().trim().min(1).max(200), en: z.string().trim().min(1).max(200) }),
  description: z.object({ ar: z.string().trim().max(400).default(''), en: z.string().trim().max(400).default('') }).default({ ar: '', en: '' }),
  image: z.string().trim().max(2000).refine((value) => !value || isSafeAssetUrl(value)).default(''),
  imagePublicId: optionalCloudinaryPublicId,
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});
export const adminCategoryUpdateSchema = adminCategoryCreateSchema.partial();

export const adminOrderUpdateSchema = z.object({
  orderStatus: z.enum(['new', 'confirmed', 'preparing', 'shipped', 'completed', 'cancelled']).optional(),
  paymentStatus: z.enum(['pending', 'awaiting_verification', 'paid', 'rejected']).optional(),
}).refine((value) => Object.keys(value).length > 0, { message: 'At least one status is required' });

// These are deliberately separate fields instead of one generic query so the
// admin UI can search customer data without ever accepting Mongo operators.
export const adminCustomerListQuerySchema = z.object({
  name: z.string().trim().max(100).optional(),
  email: z.string().trim().max(254).optional(),
  phone: z.string().trim().max(40).optional(),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
}).strip();

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), 'Invalid date');

export const adminProductListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).default(''),
  status: z.enum(['all', 'active', 'inactive']).default('all'),
  category: z.string().trim().regex(/^[a-f\d]{24}$/i, 'Invalid category ID').optional(),
  minPrice: z.coerce.number().finite().nonnegative().optional(),
  maxPrice: z.coerce.number().finite().nonnegative().optional(),
}).refine((value) => value.minPrice === undefined || value.maxPrice === undefined || value.minPrice <= value.maxPrice, {
  path: ['maxPrice'], message: 'Maximum price must be greater than or equal to minimum price',
}).strip();

export const adminOrderListQuerySchema = z.object({
  search: z.string().trim().max(100).default(''),
  status: z.enum(['new', 'confirmed', 'preparing', 'shipped', 'completed', 'cancelled']).optional(),
  paymentMethod: z.enum(['cod', 'instapay']).optional(),
  dateFrom: dateOnly.optional(),
  dateTo: dateOnly.optional(),
}).refine((value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo, {
  path: ['dateTo'], message: 'End date must not be before start date',
}).strip();

export const adminSettingsSchema = z.object({
  storeName: z.string().trim().min(1).max(120),
  logoUrl: z.string().trim().max(2000).refine((value) => !value || isSafeAssetUrl(value)),
  logoPublicId: optionalCloudinaryPublicId,
  hero: z.object({
    posterUrl: z.string().trim().max(2000).refine((value) => !value || isSafeAssetUrl(value)),
    posterPublicId: optionalCloudinaryPublicId,
  }),
  promoBanner: z.object({
    image: z.string().trim().max(2000).refine((value) => !value || isSafeAssetUrl(value)),
    imagePublicId: optionalCloudinaryPublicId,
    isActive: z.boolean(),
  }),
  featuredCollection: z.object({
    image: z.string().trim().max(2000).refine((value) => !value || isSafeAssetUrl(value)),
    imagePublicId: optionalCloudinaryPublicId,
  }),
  currency: z.string().trim().min(1).max(12),
  deliveryFee: z.number().nonnegative(),
  freeShippingThreshold: z.number().nonnegative().nullable().optional(),
  announcement: z.object({
    ar: z.string().trim().max(300),
    en: z.string().trim().max(300),
    isActive: z.boolean(),
  }),
  contact: z.object({
    phone: z.string().trim().max(40),
    whatsapp: z.string().trim().max(40),
    email: z.union([z.email().max(254), z.literal('')]),
  }),
  social: z.object({
    instagram: externalUrl,
    facebook: externalUrl,
    tiktok: externalUrl,
  }),
  instapay: z.object({
    enabled: z.boolean(),
    identifier: z.string().trim().max(120),
    accountName: z.string().trim().max(120),
    instructions: z.object({
      ar: z.string().trim().max(1000),
      en: z.string().trim().max(1000),
    }),
  }),
  shipping: z.object({
    enabled: z.boolean(),
    freeShipping: z.object({
      enabled: z.boolean(),
      threshold: z.number().nonnegative(),
    }),
    zones: z.array(z.object({
      _id: z.string().optional(),
      name: z.object({ ar: z.string().trim().min(1).max(120), en: z.string().trim().min(1).max(120) }),
      governorates: z.array(z.string().trim().min(2).max(120)).min(1).max(50),
      areas: z.array(z.string().trim().min(1).max(120)).max(100).default([]),
      price: z.number().nonnegative(),
      estimatedDaysMin: z.number().int().min(1).max(60),
      estimatedDaysMax: z.number().int().min(1).max(60),
      isActive: z.boolean(),
    }).refine((zone) => zone.estimatedDaysMax >= zone.estimatedDaysMin, {
      message: 'Maximum delivery days must be greater than or equal to minimum days',
      path: ['estimatedDaysMax'],
    })).max(100)
      .refine((zones) => zones.every((zone) => !zone.areas.length || zone.governorates.length === 1), {
        message: 'An area-specific zone must belong to exactly one governorate',
      })
      .refine((zones) => {
        const areaKeys = zones.flatMap((zone) => zone.areas.map((area) =>
          `${zone.governorates[0].trim().toLocaleLowerCase('ar-EG')}|${area.trim().toLocaleLowerCase('ar-EG')}`,
        ));
        return new Set(areaKeys).size === areaKeys.length;
      }, 'An area can belong to only one shipping zone within its governorate'),
  }).optional(),
});

export const shippingQuoteSchema = z.object({
  subtotal: z.number().nonnegative(),
  governorate: z.string().trim().min(2).max(120),
  area: z.string().trim().min(1).max(120).optional(),
});
