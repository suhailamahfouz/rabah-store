import { Router } from 'express';
import { getRobots, getSitemap } from '../controllers/seo.controller.js';

export const seoRouter = Router();

seoRouter.get('/sitemap.xml', getSitemap);
seoRouter.get('/robots.txt', getRobots);
