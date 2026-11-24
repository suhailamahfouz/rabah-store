import test from 'node:test';
import assert from 'node:assert/strict';
import { Order } from './Order.js';

test('Order.customerId is an optional Customer reference covered by indexes that lead with it', () => {
  const path = Order.schema.path('customerId') as { options: { ref?: string; required?: boolean; index?: boolean } };

  assert.equal(path.options.ref, 'Customer');
  assert.notEqual(path.options.required, true);
  // customerId is indexed through compound indexes whose first key is customerId.
  const leading = Order.schema.indexes().filter(([fields]) => Object.keys(fields)[0] === 'customerId');
  assert.ok(leading.length >= 1);
  assert.ok(leading.some(([fields]) => 'createdAt' in fields));
  assert.ok(leading.some(([fields, options]) => 'idempotencyKey' in fields && options?.unique === true));
});

test('legacy orders remain valid without customerId', () => {
  const order = new Order({
    orderNumber: 'RBAH-LEGACY-1',
    customer: {
      fullName: 'Legacy Guest',
      phone: '01000000000',
      governorate: 'Cairo',
      city: 'Cairo',
      address: 'Legacy address',
    },
    items: [],
    subtotal: 0,
    shippingFee: 0,
    total: 0,
    paymentMethod: 'cod',
    accessToken: 'legacy-token',
  });

  assert.equal(order.customerId, undefined);
});
