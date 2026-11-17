import test from 'node:test';
import assert from 'node:assert/strict';
import { listMine } from './order.controller.js';
import { Order } from '../models/Order.js';
import { orderListQuerySchema } from '../validators/order.js';
import { requireCustomer } from '../middleware/auth.js';

test('GET /orders/mine filters only by authenticated customer and paginates summaries', async () => {
  const originalFind = Order.find;
  const originalCount = Order.countDocuments;
  const calls: Record<string, unknown> = {};
  let payload: any;

  (Order as any).find = (filter: unknown) => {
    calls.filter = filter;
    const chain = {
      select(value: unknown) { calls.select = value; return chain; },
      sort(value: unknown) { calls.sort = value; return chain; },
      skip(value: unknown) { calls.skip = value; return chain; },
      limit(value: unknown) { calls.limit = value; return chain; },
      lean: async () => [{
        _id: 'order-1', orderNumber: 'RBAH-1', orderStatus: 'new',
        paymentStatus: 'pending', paymentMethod: 'cod', currency: 'EGP',
        subtotal: 100, shippingFee: 20, total: 120, createdAt: new Date('2026-01-02'),
        customerId: 'other-sensitive-id', accessToken: 'secret', items: [{ product: 'secret' }],
      }],
    };
    return chain;
  };
  (Order as any).countDocuments = async (filter: unknown) => {
    calls.countFilter = filter;
    return 3;
  };

  try {
    const res = { json(value: unknown) { payload = value; } };
    await listMine({
      query: { page: '2', limit: '1' },
      customerId: 'customer-a',
    } as any, res as any);
  } finally {
    (Order as any).find = originalFind;
    (Order as any).countDocuments = originalCount;
  }

  assert.deepEqual(calls.filter, { customerId: 'customer-a' });
  assert.deepEqual(calls.countFilter, { customerId: 'customer-a' });
  assert.equal(calls.skip, 1);
  assert.equal(calls.limit, 1);
  assert.deepEqual(payload.pagination, { page: 2, limit: 1, total: 3, totalPages: 3 });
  assert.deepEqual(payload.data[0], {
    id: 'order-1', orderNumber: 'RBAH-1', status: 'new', paymentStatus: 'pending',
    paymentMethod: 'cod', currency: 'EGP', subtotal: 100, shippingFee: 20,
    total: 120, createdAt: '2026-01-02T00:00:00.000Z',
  });
  assert.equal(JSON.stringify(payload).includes('secret'), false);
});

test('order list query rejects limits above 50', () => {
  assert.equal(orderListQuerySchema.safeParse({ page: 1, limit: 51 }).success, false);
  assert.deepEqual(orderListQuerySchema.parse({}), { page: 1, limit: 20 });
});

test('GET /orders/mine requires an authenticated customer', async () => {
  let nextError: any;
  await requireCustomer({ cookies: {} } as any, {} as any, (error?: unknown) => { nextError = error; });
  assert.equal(nextError?.statusCode, 401);
});
