import { z } from 'zod';

const customerIdentifierSchema = z.string().trim().min(1).max(254).refine((value) => {
  if (value.includes('@')) return z.email().safeParse(value).success;
  const phone = value.replace(/[\s()-]/g, '');
  return /^\+?\d{7,15}$/.test(phone);
}, 'Enter a valid email address or phone number');

const loginIdentifierSchema = z.string().trim().min(1).max(254).refine((value) => {
  if (value.includes('@')) return z.email().safeParse(value).success;
  const phone = value.replace(/[\s()-]/g, '');
  if (/^\+?\d{7,15}$/.test(phone)) return true;
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]{2,79}$/.test(value);
}, 'Enter a valid email address, username, or phone number');

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  identifier: customerIdentifierSchema,
  password: z.string().min(12, 'Password must be at least 12 characters').max(72),
});

export const loginSchema = z.object({
  identifier: loginIdentifierSchema,
  password: z.string().min(1).max(72),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
