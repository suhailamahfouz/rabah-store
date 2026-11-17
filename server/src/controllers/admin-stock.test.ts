import assert from 'node:assert/strict';
import test from 'node:test';
import { updateProduct } from './admin-management.controller.js';
import { Product } from '../models/Product.js';

test('admin product edits preserve general stock and reject new color lists', async () => {
  const current = { price: 500, salePrice: null, stock: 17, variants: [] as Array<{ stock: number }> };
  const originalFind = Product.findById;
  const originalUpdate = Product.findByIdAndUpdate;
  let updates: Record<string, unknown> = {};
  (Product as any).findById = async () => current;
  (Product as any).findByIdAndUpdate = (_id: unknown, update: { $set: Record<string, unknown> }) => {
    updates = update.$set;
    return { populate: async () => ({ ...current, ...updates }) };
  };
  const edit = (body: unknown) => updateProduct({ params: { id: '507f1f77bcf86cd799439011' }, body } as any, { json() {} } as any);
  try {
    await edit({ stock: 12, variants: [] });
    assert.equal(updates.stock, 12, 'empty colors must not replace entered stock with zero');
    await edit({ price: 450 });
    assert.equal(Object.hasOwn(updates, 'stock'), false, 'price edits must not write stock');
    assert.equal(Object.hasOwn(updates, 'variants'), false, 'price edits must not erase colors');
    assert.equal(Object.hasOwn(updates, 'images'), false, 'price edits must not erase images');
    assert.equal(Object.hasOwn(updates, 'isActive'), false, 'price edits must not reset visibility');
    await edit({ variants: [] });
    assert.equal(Object.hasOwn(updates, 'stock'), false, 'omitted stock must remain unchanged');
    await edit({ stock: 0, variants: [] });
    assert.equal(updates.stock, 0, 'explicit zero stock is valid');
    await assert.rejects(() => edit({ stock: 99, variants: [{ color: { name: { ar: 'أسود', en: 'Black' } }, stock: 4 }] }));
    await edit({ isActive: true });
    assert.equal(Object.hasOwn(updates, 'stock'), false, 'visibility changes must not overwrite live inventory');
    await edit({ variants: [], stock: 9 });
    assert.equal(updates.stock, 9, 'removing colors must respect the new general stock');
  } finally {
    Product.findById = originalFind;
    Product.findByIdAndUpdate = originalUpdate;
  }
});
