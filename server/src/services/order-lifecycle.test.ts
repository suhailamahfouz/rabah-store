import assert from 'node:assert/strict';
import test from 'node:test';
import { Counter, Order, Product } from '../models/index.js';
import { Settings } from '../models/Settings.js';
import { cancelOrder, createOrder } from './order.service.js';

const settings = {
  currency: 'EGP', deliveryFee: 25, freeShippingThreshold: null,
  instapay: { enabled: true, identifier: 'account' },
  shipping: { enabled: false, freeShipping: { enabled: false, threshold: 0 }, zones: [] },
};

const input = {
  idempotencyKey: 'checkout-key-1',
  customer: { fullName: 'Customer', phone: '01000000000', governorate: 'Cairo', city: 'Cairo', address: '12 Nile Street', notes: '' },
  items: [{ productSlug: 'test-product', quantity: 2, note: 'يرجى تغليف المنتج كهدية' }],
  paymentMethod: 'cod' as const,
  currency: 'USD',
};

function product(stock: number) {
  return { _id: 'product-1', sku: 'SKU-1', slug: 'test-product', name: { ar: 'منتج', en: 'Product' }, price: 100, images: [], variants: [], stock };
}

test('order creation recalculates trusted values and returns the same order for concurrent idempotent retries', async () => {
  const original = {
    orderFind: Order.findOne, orderCreate: Order.create, productFind: Product.findOne,
    productFindUpdate: Product.findOneAndUpdate, productUpdate: Product.updateOne,
    counter: Counter.findOneAndUpdate, settingsFind: Settings.findOne,
  };
  let stock = 10;
  let stored: any;
  let creates = 0;
  (Settings as any).findOne = async () => settings;
  (Counter as any).findOneAndUpdate = async () => ({ seq: 1 });
  (Order as any).findOne = () => ({ select: async () => stored });
  (Order as any).create = async (value: any) => {
    creates += 1;
    if (creates === 2) {
      const duplicate: any = new Error('duplicate idempotency key');
      duplicate.code = 11000;
      throw duplicate;
    }
    stored = { _id: 'order-1', createdAt: new Date('2026-01-01T00:00:00.000Z'), ...value };
    return stored;
  };
  (Product as any).findOne = async () => product(stock);
  (Product as any).findOneAndUpdate = async (_filter: unknown, update: any) => {
    stock += update.$inc.stock;
    return product(stock);
  };
  (Product as any).updateOne = async (_filter: unknown, update: any) => {
    stock += update.$inc.stock;
    return { matchedCount: 1 };
  };

  try {
    const [first, retry] = await Promise.all([createOrder(input), createOrder(input)]);
    assert.equal(creates, 2);
    assert.equal(first.orderNumber, retry.orderNumber);
    assert.equal(first.total, 200);
    assert.equal(first.currency, 'EGP');
    assert.equal(stock, 8);
    assert.equal(stored.items[0].note, input.items[0].note);
    assert.equal(typeof first.accessToken, 'string');
  } finally {
    (Order as any).findOne = original.orderFind;
    (Order as any).create = original.orderCreate;
    (Product as any).findOne = original.productFind;
    (Product as any).findOneAndUpdate = original.productFindUpdate;
    (Product as any).updateOne = original.productUpdate;
    (Counter as any).findOneAndUpdate = original.counter;
    (Settings as any).findOne = original.settingsFind;
  }
});

test('failed order persistence rolls reserved stock back', async () => {
  const original = {
    orderFind: Order.findOne, orderCreate: Order.create, productFind: Product.findOne,
    productFindUpdate: Product.findOneAndUpdate, productUpdate: Product.updateOne,
    counter: Counter.findOneAndUpdate, settingsFind: Settings.findOne,
  };
  let stock = 4;
  (Settings as any).findOne = async () => settings;
  (Counter as any).findOneAndUpdate = async () => ({ seq: 2 });
  (Order as any).findOne = () => ({ select: async () => null });
  (Order as any).create = async () => { throw new Error('write failed'); };
  (Product as any).findOne = async () => product(stock);
  (Product as any).findOneAndUpdate = async (_filter: unknown, update: any) => { stock += update.$inc.stock; return product(stock); };
  (Product as any).updateOne = async (_filter: unknown, update: any) => { stock += update.$inc.stock; return { matchedCount: 1 }; };

  try {
    await assert.rejects(() => createOrder({ ...input, idempotencyKey: 'checkout-key-2' }), /write failed/);
    assert.equal(stock, 4);
  } finally {
    (Order as any).findOne = original.orderFind;
    (Order as any).create = original.orderCreate;
    (Product as any).findOne = original.productFind;
    (Product as any).findOneAndUpdate = original.productFindUpdate;
    (Product as any).updateOne = original.productUpdate;
    (Counter as any).findOneAndUpdate = original.counter;
    (Settings as any).findOne = original.settingsFind;
  }
});

test('concurrent cancellation restores inventory exactly once', async () => {
  const original = { claim: Order.findOneAndUpdate, find: Order.findById, productUpdate: Product.updateOne, orderUpdate: Order.updateOne };
  let cancelled = false;
  let restores = 0;
  const order = { _id: 'order-1', orderStatus: 'new', stockRestored: false, items: [{ product: 'product-1', quantity: 2 }] };
  (Order as any).findOneAndUpdate = async () => {
    if (cancelled) return null;
    cancelled = true;
    return { ...order, orderStatus: 'cancelled', stockRestored: true };
  };
  (Order as any).findById = async () => ({ ...order, orderStatus: 'cancelled', stockRestored: true });
  (Order as any).updateOne = async () => ({ acknowledged: true });
  (Product as any).updateOne = async () => { restores += 1; return { matchedCount: 1 }; };

  try {
    const results = await Promise.all([cancelOrder('order-1'), cancelOrder('order-1')]);
    assert.equal(results.every((value) => value.orderStatus === 'cancelled'), true);
    assert.equal(restores, 1);
  } finally {
    (Order as any).findOneAndUpdate = original.claim;
    (Order as any).findById = original.find;
    (Order as any).updateOne = original.orderUpdate;
    (Product as any).updateOne = original.productUpdate;
  }
});

test('cancelling an old color order restores general stock after conversion', async () => {
  const original = { claim: Order.findOneAndUpdate, update: Product.updateOne };
  let stock = 5;
  (Order as any).findOneAndUpdate = async () => ({ items: [{ product: 'product-1', variantId: 'old-color', quantity: 2 }] });
  (Product as any).updateOne = async (filter: any, update: any) => {
    if (filter['variants._id']) return { matchedCount: 0 };
    assert.deepEqual(filter['variants.0'], { $exists: false });
    stock += update.$inc.stock;
    return { matchedCount: 1 };
  };
  try {
    await cancelOrder('old-order');
    assert.equal(stock, 7);
  } finally {
    Order.findOneAndUpdate = original.claim;
    Product.updateOne = original.update;
  }
});

test('failed order-number generation rolls reserved stock back', async () => {
  const original = {
    orderFind: Order.findOne, orderCreate: Order.create, productFind: Product.findOne,
    productFindUpdate: Product.findOneAndUpdate, productUpdate: Product.updateOne,
    counter: Counter.findOneAndUpdate, settingsFind: Settings.findOne,
  };
  let stock = 4;
  let creates = 0;
  (Settings as any).findOne = async () => settings;
  (Counter as any).findOneAndUpdate = async () => { throw new Error('counter unavailable'); };
  (Order as any).findOne = () => ({ select: async () => null });
  (Order as any).create = async () => { creates += 1; return {}; };
  (Product as any).findOne = async () => product(stock);
  (Product as any).findOneAndUpdate = async (_filter: unknown, update: any) => { stock += update.$inc.stock; return product(stock); };
  (Product as any).updateOne = async (_filter: unknown, update: any) => { stock += update.$inc.stock; return { matchedCount: 1 }; };

  try {
    await assert.rejects(() => createOrder({ ...input, idempotencyKey: 'checkout-key-counter' }), /counter unavailable/);
    assert.equal(creates, 0);
    assert.equal(stock, 4);
  } finally {
    (Order as any).findOne = original.orderFind;
    (Order as any).create = original.orderCreate;
    (Product as any).findOne = original.productFind;
    (Product as any).findOneAndUpdate = original.productFindUpdate;
    (Product as any).updateOne = original.productUpdate;
    (Counter as any).findOneAndUpdate = original.counter;
    (Settings as any).findOne = original.settingsFind;
  }
});
