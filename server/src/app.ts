import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { noSqlSanitize } from './middleware/sanitize.js';
import { csrfGuard } from './middleware/csrf.js';
import { errorHandler, notFound } from './middleware/error.js';
import { catalogRouter } from './routes/catalog.routes.js';
import { orderRouter } from './routes/order.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { seoRouter } from './routes/seo.routes.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (env.isProd) app.set('trust proxy', 1); // correct client IPs behind Render/Railway/Nginx

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // product images are loaded by the client origin
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } }, // pure JSON API
    }),
  );
  app.use(cors({
    origin(origin, callback) {
      // Requests without an Origin are non-browser/server-to-server requests.
      // Browser credential requests are limited to the explicit allow-list.
      callback(null, !origin || env.corsOrigins.includes(origin));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'X-Requested-With'],
    maxAge: 600,
  }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(noSqlSanitize);
  app.use('/api', apiLimiter);
  app.use('/api', csrfGuard);

  // Public, non-sensitive images only. Payment proofs are NOT here (admin-gated route).
  // Product uploads have UUID filenames, so they can be cached aggressively
  // without risking an old image after an admin upload replaces it.
  app.use('/media', express.static(path.resolve(env.UPLOAD_DIR, 'public'), {
    maxAge: '1y',
    immutable: true,
    etag: true,
    index: false,
  }));

  // Expose these at the public root for production reverse proxies and under
  // /api for a static Angular deployment that already proxies API requests.
  app.use(seoRouter);
  app.use('/api', seoRouter);

  app.get('/api/health', (_req, res) => { res.json({ success: true, status: 'ok' }); });

  // Public storefront API (no auth). Order creation is rate-limited at the route level.
  app.use('/api', authRouter);
  app.use('/api', adminRouter);
  app.use('/api', catalogRouter);
  app.use('/api', orderRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
