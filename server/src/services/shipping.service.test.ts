import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateShipping } from './shipping.service.js';

const settings = {
  deliveryFee: 25,
  freeShippingThreshold: 85,
  shipping: {
    enabled: true,
    freeShipping: { enabled: true, threshold: 500 },
    zones: [
      { _id: 'cairo', name: { ar: 'القاهرة', en: 'Cairo' }, governorates: ['القاهرة', 'Cairo'], price: 50, estimatedDaysMin: 1, estimatedDaysMax: 3, isActive: true },
      { _id: 'alex', name: { ar: 'الإسكندرية', en: 'Alexandria' }, governorates: ['الإسكندرية'], price: 75, estimatedDaysMin: 2, estimatedDaysMax: 5, isActive: true },
      { _id: 'stopped', name: { ar: 'متوقفة', en: 'Stopped' }, governorates: ['سوهاج'], price: 100, estimatedDaysMin: 3, estimatedDaysMax: 7, isActive: false },
    ],
  },
} as any;

test('calculates the active governorate zone price', () => {
  assert.equal(calculateShipping(settings, 100, 'القاهرة').fee, 50);
  assert.equal(calculateShipping(settings, 100, 'الإسكندرية').fee, 75);
});

test('applies free shipping only when enabled and threshold is reached', () => {
  const quote = calculateShipping(settings, 500, 'القاهرة');
  assert.equal(quote.fee, 0);
  assert.equal(quote.isFree, true);
});

test('rejects inactive or unknown governorates', () => {
  assert.throws(() => calculateShipping(settings, 100, 'سوهاج'), /Shipping is unavailable/);
  assert.throws(() => calculateShipping(settings, 100, 'أسوان'), /Shipping is unavailable/);
});

test('disabled shipping returns zero', () => {
  assert.equal(calculateShipping({ ...settings, shipping: { ...settings.shipping, enabled: false } }, 100, 'أسوان').fee, 0);
});

test('uses a city or area-specific zone before the governorate-wide fallback', () => {
  const withAreaZones = {
    ...settings,
    shipping: {
      ...settings.shipping,
      zones: [
        { _id: 'cairo-all', name: { ar: 'القاهرة', en: 'Cairo' }, governorates: ['القاهرة'], areas: [], price: 60, estimatedDaysMin: 2, estimatedDaysMax: 4, isActive: true },
        { _id: 'nasr-city', name: { ar: 'مدينة نصر', en: 'Nasr City' }, governorates: ['القاهرة'], areas: ['مدينة نصر'], price: 35, estimatedDaysMin: 1, estimatedDaysMax: 2, isActive: true },
      ],
    },
  } as any;

  assert.equal(calculateShipping(withAreaZones, 100, 'القاهرة', 'مدينة نصر').fee, 35);
  assert.equal(calculateShipping(withAreaZones, 100, 'القاهرة', 'المعادي').fee, 60);
});

test('does not apply a legacy free-shipping threshold when free shipping is disabled', () => {
  const quote = calculateShipping({
    ...settings,
    freeShippingThreshold: 1,
    shipping: { ...settings.shipping, freeShipping: { enabled: false, threshold: 500 } },
  } as any, 1000, 'القاهرة');

  assert.equal(quote.isFree, false);
  assert.equal(quote.fee, 50);
});
