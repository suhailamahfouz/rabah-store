import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CategoryService } from './category.service';
import { ProductService } from './product.service';
import { StoreService } from './store.service';

describe('Shipping announcement', () => {
  let store: StoreService;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(),
      { provide: CategoryService, useValue: { categories: signal([]), error: signal('') } },
      { provide: ProductService, useValue: { products: signal([]), error: signal(''), loadByIds() {} } },
    ] });
    store = TestBed.inject(StoreService);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/store-settings').flush({ success: true, data: {
      ...store.storeSettings(), freeShippingThreshold: 85,
      shipping: { enabled: true, freeShipping: { enabled: true, threshold: 1000 }, zones: [] },
    } });
    http.verify();
  });

  it('uses shipping management instead of the old 85 threshold in both languages', () => {
    store.lang.set('en');
    expect(store.announcementText()).toBe('Free delivery on orders of EGP 1000 or more');
    store.lang.set('ar');
    expect(store.announcementText()).toContain('1000');
    expect(store.announcementText()).not.toContain('85');
  });

  it('hides the offer when free shipping is disabled', () => {
    store.storeSettings.update(settings => ({ ...settings,
      shipping: { ...settings.shipping!, freeShipping: { enabled: false, threshold: 1000 } },
    }));
    expect(store.announcementText()).toBe('');
  });

  it('handles a zero threshold and disabled shipping without advertising the old offer', () => {
    store.lang.set('en');
    store.storeSettings.update(settings => ({ ...settings,
      shipping: { ...settings.shipping!, freeShipping: { enabled: true, threshold: 0 } },
    }));
    expect(store.announcementText()).toBe('Free delivery on all orders');
    store.storeSettings.update(settings => ({ ...settings, shipping: { ...settings.shipping!, enabled: false } }));
    expect(store.announcementText()).toBe('');
  });
});
