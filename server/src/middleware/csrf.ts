import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

/**
 * Cookie auth needs CSRF protection on state-changing requests. We enforce:
 *  1) Origin (or Referer) must be an allowed client origin, and
 *  2) a custom header, which a cross-site form cannot send.
 */
export function csrfGuard(req: Request, _res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (origin && !env.corsOrigins.includes(origin)) return next(AppError.forbidden('Origin not allowed'));
  // A state-changing request made with an authentication cookie must carry a
  // verified Origin. The custom header below separately blocks HTML forms.
  if (!origin && (req.cookies?.rabah_admin || req.cookies?.rabah_customer)) {
    return next(AppError.forbidden('Origin header required'));
  }
  if (req.get('x-requested-with') !== 'XMLHttpRequest') return next(AppError.forbidden('Missing CSRF header'));
  next();
}
