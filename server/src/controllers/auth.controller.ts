import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Admin } from '../models/Admin.js';
import { Customer } from '../models/Customer.js';
import {
  COOKIE_NAME as ADMIN_COOKIE_NAME,
  CUSTOMER_COOKIE_NAME,
  cookieOptions as adminCookieOptions,
  getOptionalCustomer,
  signCustomerToken,
  signToken,
} from '../middleware/auth.js';
import { AppError } from '../utils/AppError.js';
import { loginSchema, registerSchema } from '../validators/auth.js';

const cookieOptions = {
  httpOnly: true,
  secure: env.isProd || env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAMESITE,
  path: '/',
  maxAge: 7 * 24 * 3600 * 1000,
} as const;

// A valid bcrypt hash at the same work factor as account passwords. Comparing
// against it for unknown accounts keeps authentication timing comparable.
const DUMMY_PASSWORD_HASH = '$2b$12$megA/tPXceBBedq2ZfDOF.Xyji42SVfgNsevX40qKMf8TDifTufsG';

function getIdentifierFields(identifier: string) {
  if (identifier.includes('@')) return { email: identifier.trim().toLowerCase() };
  return { phone: identifier.replace(/[\s()-]/g, '') };
}

function setCustomerCookie(res: Response, customerId: string): void {
  res.cookie(CUSTOMER_COOKIE_NAME, signCustomerToken(customerId), cookieOptions);
}

function clearCookie(res: Response, name: string, options: typeof cookieOptions): void {
  res.clearCookie(name, { ...options, maxAge: undefined });
}

export async function register(req: Request, res: Response): Promise<void> {
  const input = registerSchema.parse(req.body);
  const identifierFields = getIdentifierFields(input.identifier);
  const duplicate = await Customer.findOne(identifierFields);
  if (duplicate) throw AppError.conflict('Could not create an account with these details');
  if ('email' in identifierFields && await Admin.exists({ email: identifierFields.email })) {
    throw AppError.conflict('Could not create an account with these details');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const customer = await Customer.create({
    name: input.name,
    ...identifierFields,
    passwordHash,
  });

  setCustomerCookie(res, customer.id);
  res.status(201).json({
    success: true,
    role: 'customer',
    user: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone },
  });
}

export async function session(req: Request, res: Response): Promise<void> {
  const adminToken = req.cookies?.[ADMIN_COOKIE_NAME];
  if (adminToken) {
    try {
      const payload = jwt.verify(adminToken, env.JWT_SECRET, {
        algorithms: ['HS256'], issuer: 'rabah-api', audience: 'rabah-admin',
      }) as jwt.JwtPayload;
      if (payload.role === 'admin') {
        const admin = await Admin.findById(payload.sub);
        if (admin?.isActive && admin.role === 'admin' && payload.ver === admin.authVersion) {
          res.json({ success: true, role: 'admin', user: { id: admin.id, name: admin.name, email: admin.email, username: admin.username } });
          return;
        }
      }
    } catch { /* fall through to the customer session check */ }
  }
  const customer = await getOptionalCustomer(req);
  if (customer) {
    res.json({ success: true, role: 'customer', user: customer });
    return;
  }
  throw AppError.unauthorized();
}

export async function login(req: Request, res: Response): Promise<void> {
  const input = loginSchema.parse(req.body);
  const identifier = input.identifier.trim().toLowerCase();
  const [admin, customer] = await Promise.all([
    Admin.findOne({ $or: [{ email: identifier }, { username: identifier }] }).select('+passwordHash'),
    Customer.findOne(getIdentifierFields(input.identifier)).select('+passwordHash'),
  ]);
  const passwordMatches = await bcrypt.compare(input.password, admin?.passwordHash ?? customer?.passwordHash ?? DUMMY_PASSWORD_HASH);

  if (admin) {
    if (!admin.isActive || !passwordMatches) {
      throw AppError.unauthorized('Invalid email/username or password');
    }

    admin.lastLoginAt = new Date();
    await admin.save();
    clearCookie(res, CUSTOMER_COOKIE_NAME, cookieOptions);
    res.cookie(ADMIN_COOKIE_NAME, signToken(admin.id, admin.authVersion), adminCookieOptions);
    res.json({
      success: true,
      role: 'admin',
      user: { id: admin.id, name: admin.name, email: admin.email, username: admin.username },
    });
    return;
  }

  if (!customer || !passwordMatches) {
    throw AppError.unauthorized('Invalid email/username or password');
  }

  clearCookie(res, ADMIN_COOKIE_NAME, adminCookieOptions);
  setCustomerCookie(res, customer.id);
  res.json({
    success: true,
    role: 'customer',
    user: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone },
  });
}

export function logout(_req: Request, res: Response): void {
  clearCookie(res, ADMIN_COOKIE_NAME, adminCookieOptions);
  clearCookie(res, CUSTOMER_COOKIE_NAME, cookieOptions);
  res.json({ success: true });
}
