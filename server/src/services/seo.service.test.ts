import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRobotsTxt, buildSitemapXml } from './seo.service.js';

test('sitemap contains canonical Arabic and English public URLs with hreflang links', () => {
  const xml = buildSitemapXml('https://rabah.example', [
    { path: '/' },
    { path: '/catalog/bags', lastModified: new Date('2026-11-15T00:00:00.000Z') },
  ]);

  assert.match(xml, /<loc>https:\/\/rabah\.example\/\?lang=ar<\/loc>/);
  assert.match(xml, /<loc>https:\/\/rabah\.example\/catalog\/bags\?lang=en<\/loc>/);
  assert.match(xml, /hreflang="x-default" href="https:\/\/rabah\.example\/catalog\/bags\?lang=ar"/);
  assert.match(xml, /<lastmod>2026-11-15T00:00:00\.000Z<\/lastmod>/);
});

test('robots keeps private pages out of crawls and exposes the root sitemap', () => {
  const robots = buildRobotsTxt('https://rabah.example');

  assert.match(robots, /Disallow: \/checkout/);
  assert.match(robots, /Disallow: \/admin\//);
  assert.match(robots, /Allow: \/api\/sitemap\.xml/);
  assert.match(robots, /Sitemap: https:\/\/rabah\.example\/sitemap\.xml/);
});
