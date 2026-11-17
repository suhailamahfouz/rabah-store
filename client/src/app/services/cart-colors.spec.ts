import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { StoreService } from './store.service';
import { CategoryService } from './category.service';
import { ProductService } from './product.service';

describe('Cart color selections', () => {
  const product = { id: 'p1', slug: 'bag', stock: 3, price: 100, name: { ar: 'شنطة', en: 'Bag' }, colorOptions: [
    { hex: '#111111', name: { ar: 'أسود', en: 'Black' } }, { hex: '#FFFFFF', name: { ar: 'أبيض', en: 'White' } },
  ] };
  beforeEach(() => {
    localStorage.setItem('rabah-cart-reset-version', '2026-11-16');
    localStorage.removeItem('rabah-cart');
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: CategoryService, useValue: { categories: signal([]), error: signal('') } },
      { provide: ProductService, useValue: { products: signal([product]), error: signal(''), loadByIds() {}, getById: () => product } },
    ] });
  });
  afterEach(() => {
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/store-settings').error(new ProgressEvent('error'));
    http.verify();
    localStorage.removeItem('rabah-cart');
  });
  it('keeps colors separate, merges matching colors, and caps all colors by general stock', () => {
    const store = TestBed.inject(StoreService);
    store.addToCart('p1');
    store.addToCart('p1', 1, '#FF0000');
    expect(store.cartCount).toBe(0);
    store.addToCart('p1', 1, '#111111');
    store.addToCart('p1', 1, '#FFFFFF');
    store.addToCart('p1', 1, '#111111');
    expect(store.cart()).toHaveLength(2);
    expect(store.cart()[0].quantity).toBe(2);
    store.updateQuantity('p1', 2, '#FFFFFF');
    store.addToCart('p1', 1, '#FFFFFF');
    expect(store.cartCount).toBe(3);
    store.removeFromCart('p1', '#FFFFFF');
    expect(store.cart()).toHaveLength(1);
    expect(store.cart()[0].color).toBe('#111111');
  });
  it('restores a selected color and its independent note after reload', () => {
    localStorage.setItem('rabah-cart', JSON.stringify([{ productId: 'p1', quantity: 1, color: '#FFFFFF', note: 'Gift' }]));
    const store = TestBed.inject(StoreService);
    expect(store.cart()[0]).toMatchObject({ color: '#FFFFFF', note: 'Gift' });
    store.updateItemNote('p1', 'New note', 0);
    expect(JSON.parse(localStorage.getItem('rabah-cart')!)[0]).toMatchObject({ color: '#FFFFFF', note: 'New note' });
  });
});
