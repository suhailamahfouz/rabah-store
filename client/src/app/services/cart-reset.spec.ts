import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CategoryService } from './category.service';
import { ProductService } from './product.service';
import { StoreService } from './store.service';

describe('Cart reset', () => {
  beforeEach(() => {
    localStorage.removeItem('rabah-cart-reset-version');
    localStorage.setItem('rabah-cart', JSON.stringify([{ productId: 'old', quantity: 3 }]));
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(),
      { provide: CategoryService, useValue: { categories: signal([]), error: signal('') } },
      { provide: ProductService, useValue: { products: signal([]), error: signal(''), loadByIds() {} } },
    ] });
  });

  afterEach(() => {
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/store-settings').error(new ProgressEvent('error'));
    http.verify();
    localStorage.removeItem('rabah-cart');
    localStorage.removeItem('rabah-cart-reset-version');
  });

  it('starts at zero and clears the previous saved cart', () => {
    const store = TestBed.inject(StoreService);
    expect(store.cartCount).toBe(0);
    expect(store.subtotal).toBe(0);
    expect(localStorage.getItem('rabah-cart')).toBe('[]');
    expect(localStorage.getItem('rabah-cart-reset-version')).toBe('2026-11-16');
  });

  it('preserves purchases saved after the one-time reset', () => {
    localStorage.setItem('rabah-cart-reset-version', '2026-11-16');
    const store = TestBed.inject(StoreService);
    expect(store.cartCount).toBe(3);
    expect(store.cart()[0].productId).toBe('old');
  });

  it('restores each note and persists edits without changing the quantity', () => {
    localStorage.setItem('rabah-cart-reset-version', '2026-11-16');
    localStorage.setItem('rabah-cart', JSON.stringify([{ productId: 'old', quantity: 3, note: 'تغليف هدية' }]));
    const store = TestBed.inject(StoreService);
    expect(store.cart()[0].note).toBe('تغليف هدية');
    store.updateItemNote('old', 'ملحوظة جديدة');
    expect(JSON.parse(localStorage.getItem('rabah-cart')!)[0].note).toBe('ملحوظة جديدة');
    expect(store.cartCount).toBe(3);
    store.updateItemNote('old', 'x'.repeat(501));
    expect(store.cart()[0].note?.length).toBe(500);
    store.updateItemNote('old', '');
    expect(store.cart()[0].note).toBe('');
  });
});
