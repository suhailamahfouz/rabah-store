import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { buildRobotsTxt, buildSitemapXml, listSitemapEntries } from '../services/seo.service.js';

export async function getSitemap(_req: Request, res: Response, next: NextFunction) {
  try {
    const entries = await listSitemapEntries();
    res.set('Cache-Control', 'public, max-age=0, s-maxage=300');
    res.type('application/xml').send(buildSitemapXml(env.siteUrl, entries));
  } catch (err) {
    next(err);
  }
}

export function getRobots(_req: Request, res: Response) {
  res.set('Cache-Control', 'public, max-age=0, s-maxage=3600');
  res.type('text/plain').send(buildRobotsTxt(env.siteUrl));
}
