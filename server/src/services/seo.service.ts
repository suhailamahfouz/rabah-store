import { Category, Product } from '../models/index.js';

export interface SitemapEntry {
  path: string;
  lastModified?: Date;
}

/** Returns only public storefront routes; inactive and demo records never leak into a sitemap. */
export async function listSitemapEntries(): Promise<SitemapEntry[]> {
  const categories = await Category.find({ isActive: true })
    .select({ _id: 1, slug: 1, updatedAt: 1 })
    .lean();
  const categoryIds = categories.map((category) => category._id);
  const products = categoryIds.length
    ? await Product.find({ isActive: true, isDemo: { $ne: true }, category: { $in: categoryIds } })
      .select({ slug: 1, updatedAt: 1 })
      .lean()
    : [];

  return [
    { path: '/' },
    { path: '/catalog' },
    ...categories.map((category) => ({
      path: `/catalog/${encodeURIComponent(category.slug)}`,
      lastModified: category.updatedAt,
    })),
    ...products.map((product) => ({
      path: `/product/${encodeURIComponent(product.slug)}`,
      lastModified: product.updatedAt,
    })),
  ];
}

export function buildSitemapXml(siteUrl: string, entries: SitemapEntry[]): string {
  const urls = entries.flatMap((entry) => (['ar', 'en'] as const).map((language) => sitemapUrl(siteUrl, entry.path, language))
    .map((loc) => toUrlElement(loc, entry.lastModified, siteUrl, entry.path)));

  return `<?xml version="1.0" encoding="UTF-8"?>\n`
    + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`
    + `${urls.join('\n')}\n`
    + `</urlset>\n`;
}

export function buildRobotsTxt(siteUrl: string): string {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin/',
    'Disallow: /cart',
    'Disallow: /checkout',
    'Disallow: /account/',
    'Disallow: /orders',
    'Disallow: /track-order',
    'Disallow: /login',
    'Disallow: /auth',
    'Allow: /api/sitemap.xml',
    'Disallow: /api/',
    '',
    `Sitemap: ${new URL('/sitemap.xml', siteUrl).toString()}`,
    '',
  ].join('\n');
}

function toUrlElement(loc: string, lastModified: Date | undefined, siteUrl: string, path: string): string {
  const alternates = (['ar', 'en'] as const)
    .map((language) => `    <xhtml:link rel="alternate" hreflang="${language}" href="${escapeXml(sitemapUrl(siteUrl, path, language))}" />`)
    .join('\n');
  const lastmod = lastModified && !Number.isNaN(lastModified.getTime())
    ? `\n    <lastmod>${lastModified.toISOString()}</lastmod>`
    : '';
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n${alternates}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(sitemapUrl(siteUrl, path, 'ar'))}" />${lastmod}\n  </url>`;
}

function sitemapUrl(siteUrl: string, path: string, language: 'ar' | 'en'): string {
  const url = new URL(path, siteUrl);
  url.searchParams.set('lang', language);
  return url.toString();
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'\"]/g, (character) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;',
  })[character] ?? character);
}
