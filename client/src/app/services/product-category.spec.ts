import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProductService } from './product.service';

describe('Category product loading', () => {
  it('requests the selected category and loads its remaining pages', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const service = TestBed.inject(ProductService);
    const http = TestBed.inject(HttpTestingController);
    service.loadCategory('bags');
    const first = http.expectOne('/api/products?category=bags&limit=24&page=1');
    expect(first.request.headers.get('Cache-Control')).toBe('no-cache');
    first.flush({ success: true, data: [{ id: 'first', category: 'bags-id' }], meta: { page: 1, limit: 24, total: 25 } });
    http.expectOne('/api/products?category=bags&limit=24&page=2').flush({
      success: true, data: [{ id: 'new-product', category: 'bags-id' }], meta: { page: 2, limit: 24, total: 25 },
    });
    expect(service.products().map(product => product.id)).toEqual(['first', 'new-product']);
    http.verify();
  });
});
