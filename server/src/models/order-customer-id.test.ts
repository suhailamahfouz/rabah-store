import test from 'node:test';
import assert from 'node:assert/strict';
import { Order } from './Order.js';

test('Order.customerId is an optional indexed Customer reference', () => {
  const path = Order.schema.path('customerId') as { options: { ref?: string; required?: boolean; index?: boolean } };

  assert.equal(path.options.ref, 'Customer');
  assert.notEqual(path.options.required, true);
  assert.equal(path.options.index, true);
  assert.ok(Order.schema.indexes().some(([fields]) => fields.customerId === 1));
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
