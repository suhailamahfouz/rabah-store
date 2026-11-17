import assert from 'node:assert/strict';
import test from 'node:test';
import { orderItemSchema } from './order.js';
import { toCustomerOrderSummary } from '../services/order.service.js';

test('item notes are optional, bounded, trimmed and included in authenticated order history', () => {
  const item = { productSlug: 'bag', quantity: 1 };
  assert.equal(orderItemSchema.safeParse(item).success, true);
  assert.equal(orderItemSchema.parse({ ...item, note: '  هدية  ' }).note, 'هدية');
  assert.equal(orderItemSchema.safeParse({ ...item, note: 'x'.repeat(501) }).success, false);
  const summary = toCustomerOrderSummary({ items: [{ ...item, note: 'هدية', name: { ar: 'شنطة' } }] });
  assert.equal(summary.items[0].note, 'هدية');
});
