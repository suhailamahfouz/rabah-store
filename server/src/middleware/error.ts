import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { MulterError } from 'multer';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(AppError.notFound('Route not found'));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong';
  let details: unknown;

  if (err instanceof AppError) {
    ({ statusCode: status, code, message, details } = err);
  } else if (err instanceof ZodError) {
    status = 400; code = 'VALIDATION_ERROR'; message = 'Validation failed';
    details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400; code = 'VALIDATION_ERROR'; message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400; code = 'BAD_REQUEST'; message = `Invalid ${err.path}`;
  } else if (err instanceof MulterError) {
    status = 400; code = 'UPLOAD_ERROR'; message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : 'Upload failed';
  } else if ((err as { code?: number })?.code === 11000) {
    status = 409; code = 'DUPLICATE'; message = 'A record with this value already exists';
  }

  if (status >= 500) {
    // Error objects can carry database queries, credentials, or request data.
    // Keep operational logging useful without serialising those values.
    console.error('Unhandled server error', { name: (err as Error)?.name ?? 'Error' });
  }
  res.status(status).json({ success: false, error: { code, message, ...(details ? { details } : {}) } });
}
