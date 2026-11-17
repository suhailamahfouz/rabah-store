import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Admin } from '../models/Admin.js';
import { Customer } from '../models/Customer.js';
import { AppError } from '../utils/AppError.js';

export const COOKIE_NAME = 'rabah_admin';
export const CUSTOMER_COOKIE_NAME = 'rabah_customer';
const JWT_ISSUER = 'rabah-api';
const ADMIN_AUDIENCE = 'rabah-admin';
const CUSTOMER_AUDIENCE = 'rabah-customer';

export interface AuthedRequest extends Request { admin?: { id: string; email: string; name: string; role: 'admin' } }
export interface CustomerRequest extends Request {
  customerId?: string;
  customer?: { id: string; name: string; email?: string; phone?: string; role: 'customer' };
}

export function signToken(adminId: string, authVersion: number): string {
  return jwt.sign({ sub: adminId, role: 'admin', ver: authVersion }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
    issuer: JWT_ISSUER,
    audience: ADMIN_AUDIENCE,
  });
}

export function signCustomerToken(customerId: string): string {
  return jwt.sign({ sub: customerId, role: 'customer' }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
    issuer: JWT_ISSUER,
    audience: CUSTOMER_AUDIENCE,
  });
}

export const cookieOptions = {
  httpOnly: true,
  secure: env.isProd || env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAMESITE,
  path: '/',
  maxAge: 7 * 24 * 3600 * 1000,
} as const;

function customerIdFromCookie(req: Request): string | undefined {
  const token = req.cookies?.[CUSTOMER_COOKIE_NAME];
  if (typeof token !== 'string' || !token) return undefined;

  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'], issuer: JWT_ISSUER, audience: CUSTOMER_AUDIENCE,
    }) as jwt.JwtPayload;
    return payload.role === 'customer' && typeof payload.sub === 'string' && payload.sub
      ? payload.sub
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Attaches a customer ID for a valid customer session. Invalid or absent
 * cookies remain guest sessions so public checkout can continue.
 */
export function optionalCustomer(req: CustomerRequest, _res: Response, next: NextFunction): void {
  const customerId = customerIdFromCookie(req);
  if (customerId) req.customerId = customerId;
  next();
}

export async function requireAdmin(req: AuthedRequest, _res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next(AppError.unauthorized());
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'], issuer: JWT_ISSUER, audience: ADMIN_AUDIENCE,
    }) as jwt.JwtPayload;
    if (payload.role !== 'admin') return next(AppError.unauthorized());
    const admin = await Admin.findById(payload.sub);
    if (!admin || !admin.isActive || admin.role !== 'admin' || payload.ver !== admin.authVersion) {
      return next(AppError.unauthorized());
    }
    req.admin = { id: admin.id, email: admin.email, name: admin.name, role: 'admin' };
    next();
  } catch {
    next(AppError.unauthorized('Session expired'));
  }
}

export async function requireCustomer(req: CustomerRequest, _res: Response, next: NextFunction) {
  const customerId = customerIdFromCookie(req);
  if (!customerId) return next(AppError.unauthorized());

  try {
    const customer = await Customer.findById(customerId);
    if (!customer) return next(AppError.unauthorized());
    req.customerId = customer.id;
    req.customer = {
      id: customer.id,
      name: customer.name,
      email: customer.email ?? undefined,
      phone: customer.phone ?? undefined,
      role: 'customer',
    };
    next();
  } catch (error) {
    next(error);
  }
}

export async function getOptionalCustomer(req: Request): Promise<CustomerRequest['customer'] | undefined> {
  const customerId = customerIdFromCookie(req);
  if (!customerId) return undefined;

  try {
    const customer = await Customer.findById(customerId);
    return customer
      ? {
          id: customer.id,
          name: customer.name,
          email: customer.email ?? undefined,
          phone: customer.phone ?? undefined,
          role: 'customer',
        }
      : undefined;
  } catch {
    return undefined;
  }
}
