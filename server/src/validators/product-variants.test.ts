import test from 'node:test';
import assert from 'node:assert/strict';
import { adminProductCreateSchema } from './admin-management.js';

const baseProduct = {
  sku: 'COLOR-001',
  slug: 'color-product',
  name: { ar: 'منتج ألوان', en: 'Color product' },
  description: { ar: '', en: '' },
  shortDescription: { ar: '', en: '' },
  category: '507f1f77bcf86cd799439011',
  price: 100,
  salePrice: null,
  stock: 0,
  images: [],
  isActive: true,
  isFeatured: false,
  isBestSeller: false,
};

test('rejects color variants after switching to general inventory', () => {
  const result = adminProductCreateSchema.safeParse({
    ...baseProduct,
    variants: [
      { color: { name: { ar: 'أحمر', en: 'Red' }, hex: '#ff0000' }, stock: 3 },
      { color: { name: { ar: 'أزرق', en: 'Blue' }, hex: '#0000ff' }, stock: 5 },
    ],
  });

  assert.equal(result.success, false);
});

test('accepts a product without variants and uses global stock', () => {
  const result = adminProductCreateSchema.safeParse({ ...baseProduct, stock: 7, variants: [] });
  assert.equal(result.success, true);
});

test('rejects duplicate colors and the removed size field', () => {
  const result = adminProductCreateSchema.safeParse({
    ...baseProduct,
    size: 'M',
    variants: [
      { color: { name: { ar: 'أحمر', en: 'Red' } }, stock: 1 },
      { color: { name: { ar: 'أحمر', en: 'Red' } }, stock: 2 },
    ],
  });

  assert.equal(result.success, false);
});
