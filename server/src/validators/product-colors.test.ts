import assert from 'node:assert/strict';
import test from 'node:test';
import { adminProductUpdateSchema } from './admin-management.js';
import { orderItemSchema } from './order.js';

test('color edits are independent of stock and omitted colors stay omitted in PATCH', () => {
  const input = { colorOptions: [{ hex: '#aabbcc', name: { ar: 'لون', en: 'Colour' } }] };
  const parsed = adminProductUpdateSchema.parse(input);
  assert.equal(parsed.colorOptions?.[0].hex, '#AABBCC');
  assert.equal('stock' in parsed, false);
  assert.equal('colorOptions' in adminProductUpdateSchema.parse({ stock: 5 }), false);
  assert.deepEqual(adminProductUpdateSchema.parse({ colorOptions: [] }).colorOptions, []);
  assert.equal(adminProductUpdateSchema.safeParse({ colorOptions: [...input.colorOptions, ...input.colorOptions] }).success, false);
  assert.equal(orderItemSchema.safeParse({ productSlug: 'bag', quantity: 1, color: 'red; background: url(x)' }).success, false);
});
