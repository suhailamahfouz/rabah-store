import rateLimit from 'express-rate-limit';

const base = {
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
  // Keep IPv6 users grouped by network, rather than permitting an attacker to
  // evade a limiter by rotating privacy addresses.
  ipv6Subnet: 56,
  // Rate-limit store failures must not silently remove brute-force protection.
  passOnStoreError: false,
};
const msg = (m: string) => ({ success: false, error: { code: 'RATE_LIMITED', message: m } });

export const apiLimiter = rateLimit({ ...base, windowMs: 15 * 60_000, limit: 600, message: msg('Too many requests') });
export const authLimiter = rateLimit({ ...base, windowMs: 15 * 60_000, limit: 10, skipSuccessfulRequests: true, message: msg('Too many login attempts, try again later') });
export const orderLimiter = rateLimit({ ...base, windowMs: 60 * 60_000, limit: 20, message: msg('Too many orders from this connection') });
// Shipping quotes and proof uploads have their own budgets so they cannot use up the order quota.
export const quoteLimiter = rateLimit({ ...base, windowMs: 60 * 60_000, limit: 120, message: msg('Too many shipping quote requests') });
export const proofLimiter = rateLimit({ ...base, windowMs: 60 * 60_000, limit: 15, message: msg('Too many payment proof uploads') });
// Tracking accepts a phone number or secret. Keep its brute-force surface small.
export const trackingLimiter = rateLimit({ ...base, windowMs: 15 * 60_000, limit: 12, message: msg('Too many tracking attempts, try again later') });
export const newsletterLimiter = rateLimit({ ...base, windowMs: 60 * 60_000, limit: 10, message: msg('Too many requests') });
