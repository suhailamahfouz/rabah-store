import 'dotenv/config';
import { z } from 'zod';

function isSafeOrigin(value: string, production: boolean): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === 'https:' || (!production && url.protocol === 'http:'))
      && !url.username
      && !url.password
      && !url.pathname.replace(/\/$/, '')
      && !url.search
      && !url.hash
    );
  } catch {
    return false;
  }
}

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  MONGODB_URI: z.string().min(10, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/, 'JWT_EXPIRES_IN must use a duration such as 15m, 12h, or 7d').default('7d'),
  // Support both common local Angular URLs. Production deployments should set
  // this explicitly to their HTTPS storefront origin(s).
  CLIENT_ORIGIN: z.string().default('http://localhost:4200,http://127.0.0.1:4200'),
  // Public storefront origin used in canonical URLs, robots.txt, and sitemap.xml.
  // It is separate from CLIENT_ORIGIN because CORS can contain more than one origin.
  SITE_URL: z.string().optional(),
  COOKIE_SECURE: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  UPLOAD_DIR: z.string().default('uploads'),
  // Kept finite because multipart files are held in memory for magic-byte
  // validation before Cloudinary receives them. 25MB covers modern camera
  // images without allowing an upload to exhaust the API process.
  MAX_UPLOAD_MB: z.coerce.number().positive().max(100).default(50),
  CLOUDINARY_CLOUD_NAME: z.string().trim().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().trim().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().trim().min(1).optional(),
}).superRefine((value, ctx) => {
  const maxTokenLifetimeMs = 7 * 24 * 60 * 60 * 1_000;
  const durationMatch = /^(\d+)([smhd])$/.exec(value.JWT_EXPIRES_IN);
  const unitMs: Record<string, number> = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  if (!durationMatch || Number(durationMatch[1]) * unitMs[durationMatch[2]] > maxTokenLifetimeMs) {
    ctx.addIssue({ code: 'custom', path: ['JWT_EXPIRES_IN'], message: 'JWT_EXPIRES_IN must not exceed 7 days' });
  }

  const origins = value.CLIENT_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);
  if (!origins.length || origins.some((origin) => !isSafeOrigin(origin, value.NODE_ENV === 'production'))) {
    ctx.addIssue({
      code: 'custom',
      path: ['CLIENT_ORIGIN'],
      message: 'CLIENT_ORIGIN must contain comma-separated origin URLs without paths, credentials, queries, or fragments',
    });
  }
  if (value.SITE_URL && !isSafeOrigin(value.SITE_URL, value.NODE_ENV === 'production')) {
    ctx.addIssue({
      code: 'custom',
      path: ['SITE_URL'],
      message: 'SITE_URL must be one HTTPS (or development HTTP) origin without paths, credentials, queries, or fragments',
    });
  }
  if (value.COOKIE_SAMESITE === 'none' && !(value.COOKIE_SECURE || value.NODE_ENV === 'production')) {
    ctx.addIssue({ code: 'custom', path: ['COOKIE_SAMESITE'], message: 'SameSite=None requires secure cookies' });
  }
  const cloudinaryValues = [value.CLOUDINARY_CLOUD_NAME, value.CLOUDINARY_API_KEY, value.CLOUDINARY_API_SECRET];
  if (cloudinaryValues.some(Boolean) && cloudinaryValues.some((entry) => !entry)) {
    ctx.addIssue({ code: 'custom', path: ['CLOUDINARY_CLOUD_NAME'], message: 'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET must be provided together' });
  }
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:\n', z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = {
  ...parsed.data,
  corsOrigins: [...new Set(parsed.data.CLIENT_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean))],
  siteUrl: (parsed.data.SITE_URL ?? parsed.data.CLIENT_ORIGIN.split(',').map((s) => s.trim()).find(Boolean) ?? 'http://localhost:4200').replace(/\/$/, ''),
  isProd: parsed.data.NODE_ENV === 'production',
  cloudinary: parsed.data.CLOUDINARY_CLOUD_NAME
    ? {
      cloudName: parsed.data.CLOUDINARY_CLOUD_NAME,
      apiKey: parsed.data.CLOUDINARY_API_KEY!,
      apiSecret: parsed.data.CLOUDINARY_API_SECRET!,
    }
    : undefined,
};
