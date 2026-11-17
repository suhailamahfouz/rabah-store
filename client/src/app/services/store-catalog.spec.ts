import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { StoreService } from './store.service';

describe('Store catalog API integration', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.setItem('rabah-cart', JSON.stringify([{ productId: 'product-id', quantity: 2 }]));
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('rabah-cart');
  });

  it('uses admin-managed categories and products while preserving existing carts', () => {
    const store = TestBed.inject(StoreService);
    const product = {
      id: 'product-id',
      sku: 'BAG-101',
      slug: 'taif-velvet-tote',
      name: { ar: 'حقيبة تايف', en: 'Taif Tote' },
      description: { ar: 'وصف كامل', en: 'Full description' },
      shortDescription: { ar: 'وصف مختصر', en: 'Short description' },
      price: 349,
      originalPrice: 429,
      salePrice: 349,
      rating: 4.8,
      reviewCount: 12,
      createdAt: '2026-03-01T00:00:00.000Z',
      stock: 5,
      category: 'category-id',
      colors: ['#641B2E'],
      variants: [{ id: 'variant-id', color: { ar: 'نبيتي', en: 'Burgundy' }, hex: '#641B2E', stock: 5 }],
      images: ['https://example.com/product.jpg'],
      features: [],
      isFeatured: true,
      isBestSeller: false,
    };
    http.expectOne('/api/categories').flush({
      success: true,
      data: [{
        id: 'category-id',
        slug: 'bags',
        name: { ar: 'حقائب', en: 'Bags' },
        description: { ar: 'وصف', en: 'Description' },
        image: 'https://example.com/category.jpg',
      }],
    });
    http.expectOne('/api/products?limit=120&page=1').flush({
      success: true,
      data: [product],
      meta: { total: 2, limit: 120 },
    });
    http.expectOne('/api/products?limit=120&page=2').flush({
      success: true,
      data: [{ ...product, id: 'product-2', slug: 'second-bag' }],
      meta: { total: 2, limit: 120 },
    });
    http.expectOne('/api/store-settings').flush({
      success: true,
      data: {
        storeName: 'RABAH', logoUrl: '', currency: 'EGP', deliveryFee: 25,
        freeShippingThreshold: 1000, announcement: { ar: '', en: '', isActive: false },
      },
    });

    expect(store.categories().map((category) => category.id)).toEqual(['category-id']);
    expect(store.categories()[0].image).toBe('https://example.com/category.jpg');
    expect(store.products()[0].category).toBe('category-id');
    expect(store.products()[0].price).toBe(349);
    expect(store.products()[0].originalPrice).toBe(429);
    expect(store.products()).toHaveLength(2);
    expect(store.getProductById('product-id')?.id).toBe('product-id');
    expect(store.subtotal).toBe(698);

    store.addToCart('product-id');
    expect(store.cart()).toEqual([{ productId: 'product-id', quantity: 3 }]);
  });

  it('does not show frontend sample products when the product API is unavailable', () => {
    const store = TestBed.inject(StoreService);
    http.expectOne('/api/categories').error(new ProgressEvent('Network error'));
    http.expectOne('/api/products?limit=120&page=1').error(new ProgressEvent('Network error'));
    http.expectOne('/api/store-settings').flush({
      success: true,
      data: {
        storeName: 'RABAH', logoUrl: '', currency: 'EGP', deliveryFee: 25,
        freeShippingThreshold: 1000, announcement: { ar: '', en: '', isActive: false },
      },
    });

    expect(store.products()).toEqual([]);
    expect(store.featuredProducts()).toEqual([]);
    expect(store.catalogError()).toBe('تعذر تحميل كتالوج المتجر من الخادم.');
  });
});
