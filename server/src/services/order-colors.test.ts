import assert from 'node:assert/strict';
import test from 'node:test';
import { Order, Product, Counter } from '../models/index.js';
import { Settings } from '../models/Settings.js';
import { createOrder } from './order.service.js';

test('orders require an available color, save its trusted name, and reserve general stock', async () => {
  const originals = { find: Product.findOne, reserve: Product.findOneAndUpdate, orderFind: Order.findOne, orderCreate: Order.create, settings: Settings.findOne, counter: Counter.findOneAndUpdate };
  let reserves = 0;
  let stored: any;
  const selected = { hex: '#111111', name: { ar: 'أسود', en: 'Black' } };
  (Product as any).findOne = async () => ({ _id: 'product1', slug: 'bag', sku: 'BAG', name: { ar: 'شنطة', en: 'Bag' }, price: 100, stock: 5, variants: [], images: [], colorOptions: [selected] });
  (Product as any).findOneAndUpdate = async (_filter: unknown, update: any) => { reserves++; assert.deepEqual(update, { $inc: { stock: -1 } }); return { stock: 4 }; };
  (Order as any).findOne = () => ({ select: async () => null });
  (Order as any).create = async (value: any) => { stored = value; return { ...value, _id: 'order1', createdAt: new Date() }; };
  (Settings as any).findOne = async () => ({ currency: 'EGP', shipping: { enabled: false } });
  (Counter as any).findOneAndUpdate = async () => ({ seq: 1 });
  const input = { idempotencyKey: 'color-test', customer: { fullName: 'Test', phone: '01000000000', governorate: 'Cairo', city: 'Cairo', address: 'Test address', notes: '' }, paymentMethod: 'cod' as const, currency: 'EGP' };
  try {
    for (const color of [undefined, '#FFFFFF']) {
      await assert.rejects(() => createOrder({ ...input, items: [{ productSlug: 'bag', quantity: 1, color }] }), /available color/);
    }
    assert.equal(reserves, 0);
    await createOrder({ ...input, items: [{ productSlug: 'bag', quantity: 1, color: '#111111' }] });
    assert.equal(reserves, 1);
    assert.deepEqual(stored.items[0].color, selected.name);
    assert.equal(stored.items[0].variantId, undefined);
  } finally {
    (Product as any).findOne = originals.find;
    (Product as any).findOneAndUpdate = originals.reserve;
    (Order as any).findOne = originals.orderFind;
    (Order as any).create = originals.orderCreate;
    (Settings as any).findOne = originals.settings;
    (Counter as any).findOneAndUpdate = originals.counter;
  }
});
