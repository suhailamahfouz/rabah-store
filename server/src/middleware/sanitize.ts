import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError.js';

/** Strips MongoDB operator keys ($...) and dotted keys from user input, in place (Express 5 safe). */
function clean(value: unknown): void {
  if (Array.isArray(value)) { value.forEach(clean); return; }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$') || key.includes('.')) delete obj[key];
      else clean(obj[key]);
    }
  }
}

export function noSqlSanitize(req: Request, _res: Response, next: NextFunction) {
  clean(req.body);
  clean(req.params);
  // Express 5: req.query is a getter returning a fresh object, so validators must re-read and
  // validate it with zod; we additionally reject operator keys here.
  for (const key of Object.keys(req.query)) {
    if (key.startsWith('$') || key.includes('.')) return next(AppError.badRequest('Invalid query'));
  }
  next();
}
