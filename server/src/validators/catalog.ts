import { z } from 'zod';

/** Public catalog query params. */
export const catalogQuerySchema = z.object({
  ids: z.string().regex(/^[a-f\d]{24}(,[a-f\d]{24}){0,119}$/i, 'Invalid product IDs').optional(),
  category: z.string().trim().toLowerCase().optional(),
  search: z.string().trim().min(1).max(120).optional(),
  featured: z.coerce.boolean().optional().default(false),
  limit: z.coerce.number().int().min(1).max(120).optional().default(48),
  page: z.coerce.number().int().min(1).optional().default(1),
});

export type CatalogQuery = z.infer<typeof catalogQuerySchema>;

/** Product lookup params. */
export const productParamsSchema = z.object({
  slug: z.string().trim().min(1).max(120),
});

export type ProductParams = z.infer<typeof productParamsSchema>;
