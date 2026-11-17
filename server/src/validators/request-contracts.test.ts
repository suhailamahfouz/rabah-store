import assert from 'node:assert/strict';
import test from 'node:test';
import { catalogQuerySchema } from './catalog.js';
import { adminOrderListQuerySchema, adminProductCreateSchema, adminProductListQuerySchema } from './admin-management.js';
import { createOrderSchema, orderTrackingSchema } from './order.js';

const product = {
  sku: 'SKU-1', slug: 'test-product', name: { ar: 'منتج', en: 'Product' },
  description: { ar: '', en: '' }, shortDescription: { ar: '', en: '' }, category: '507f1f77bcf86cd799439011',
  price: 200, salePrice: 150, stock: 3, variants: [], images: [], isActive: true, isFeatured: false, isBestSeller: false,
};

test('catalog and admin product contracts accept normalized requests and reject malformed filters', () => {
  assert.deepEqual(catalogQuerySchema.parse({ category: ' BAGS ', featured: 'true', page: '2' }), {
    category: 'bags', featured: true, page: 2, limit: 48,
  });
  assert.equal(adminProductCreateSchema.safeParse(product).success, true);
  assert.equal(adminProductCreateSchema.safeParse({ ...product, salePrice: 200 }).success, false);
  assert.equal(adminProductListQuerySchema.safeParse({ minPrice: 100, maxPrice: 50 }).success, false);
  assert.equal(adminOrderListQuerySchema.safeParse({ dateFrom: '2026-05-02', dateTo: '2026-05-01' }).success, false);
});

test('order contracts reject untrusted prices and require a tracking proof', () => {
  const result = createOrderSchema.parse({
    idempotencyKey: 'checkout-key', customer: { fullName: 'Customer', phone: '01000000000', governorate: 'Cairo', city: 'Cairo', address: '12 Nile Street' },
    items: [{ productSlug: 'test-product', quantity: 1 }], paymentMethod: 'cod', currency: 'USD', shippingFee: 1,
  });
  assert.equal(result.shippingFee, 1);
  assert.equal(orderTrackingSchema.safeParse({ orderNumber: 'RBAH-2026-00001' }).success, false);
  assert.equal(orderTrackingSchema.safeParse({ orderNumber: 'RBAH-2026-00001', accessCode: 'a'.repeat(64) }).success, true);
  assert.equal(createOrderSchema.safeParse({ ...result, items: [{ productSlug: 'test-product', quantity: 101 }] }).success, false);
});
