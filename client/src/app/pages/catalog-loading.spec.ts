import { storefrontLoadingInterceptor } from '../interceptors/storefront-loading.interceptor';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { StoreService } from '../services/store.service';
import { vi } from 'vitest';

describe('Direct storefront navigation loads products', () => {
  const product = { id: '507f1f77bcf86cd799439011', slug: 'sample-bag', name: { ar: 'شنطة اختبار', en: 'Test Bag' },
    description: { ar: '', en: '' }, shortDescription: { ar: '', en: '' }, price: 100, originalPrice: 100,
    stock: 8, rating: 0, reviewCount: 0, category: 'bags-id', createdAt: '2026-01-01', colors: [], variants: [], images: [], features: [], isBestSeller: true };
  beforeEach(() => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    localStorage.removeItem('rabah-cart');
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([storefrontLoadingInterceptor])), provideHttpClientTesting(), provideRouter(routes)] });
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  for (const route of ['/', '/catalog', '/product/sample-bag']) {
    it(`loads MongoDB data when opening ${route} without visiting another page first`, async () => {
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(route);
      const http = TestBed.inject(HttpTestingController);
      expect(harness.routeNativeElement?.querySelector('app-storefront-skeleton')).toBeTruthy();
      http.expectOne('/api/categories').flush({ success: true, data: [] });
      http.expectOne('/api/store-settings').flush({ success: true, data: TestBed.inject(StoreService).storeSettings() });
      if (route.startsWith('/product/')) {
        http.expectOne('/api/products/sample-bag').flush({ success: true, data: product });
      } else {
        http.expectOne('/api/products?limit=24&page=1').flush({ success: true, data: [product], meta: { total: 1, limit: 24, page: 1 } });
      }
      harness.detectChanges();
      expect(harness.routeNativeElement?.textContent).toContain('شنطة اختبار');
      expect(harness.routeNativeElement?.querySelector('app-storefront-skeleton')).toBeFalsy();
      http.verify();
    });
  }
});
