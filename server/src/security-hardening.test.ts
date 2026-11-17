import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { hasValidProofSignature } from './middleware/uploadProof.js';
import { matchesOrderAccessToken, toSummary } from './services/order.service.js';

test('payment proof bytes must match the declared MIME type', () => {
  const png = {
    mimetype: 'image/png',
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  } as Express.Multer.File;
  const spoofed = { ...png, mimetype: 'image/jpeg' } as Express.Multer.File;

  assert.equal(hasValidProofSignature(png), true);
  assert.equal(hasValidProofSignature(spoofed), false);
});

test('order capabilities are checked by hash and are not echoed from stored order data', () => {
  const token = 'a'.repeat(64);
  const storedOrder = {
    _id: 'order-1', orderNumber: 'RBAH-1', orderStatus: 'new', paymentStatus: 'pending',
    paymentMethod: 'cod', currency: 'EGP', subtotal: 10, shippingFee: 0, total: 10,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    accessTokenHash: createHash('sha256').update(token).digest('hex'),
  };

  assert.equal(matchesOrderAccessToken(storedOrder, token), true);
  assert.equal(matchesOrderAccessToken(storedOrder, 'b'.repeat(64)), false);
  assert.equal('accessToken' in toSummary(storedOrder), false);
  assert.equal(toSummary(storedOrder, token).accessToken, token);
});
