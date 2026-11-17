import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { storefrontLoadingInterceptor } from './storefront-loading.interceptor';
import { StorefrontLoadingService } from '../services/storefront-loading.service';

describe('Storefront cold-start recovery', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let state: StorefrontLoadingService;
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([storefrontLoadingInterceptor])), provideHttpClientTesting()] });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    state = TestBed.inject(StorefrontLoadingService);
  });
  afterEach(() => { backend.verify(); vi.useRealTimers(); });
  it('shows loading immediately and releases it without an artificial delay on success', () => {
    const received = vi.fn();
    http.get('/api/products').subscribe(received);
    expect(state.busy('/api/products')).toBe(true);
    backend.expectOne('/api/products').flush({ data: [] });
    expect(received).toHaveBeenCalledOnce();
    expect(state.busy('/api/products')).toBe(false);
    expect(state.failed('/api/products')).toBe(false);
  });
  it('recovers from a waking backend while keeping skeletons active', async () => {
    http.get('/api/products').subscribe();
    backend.expectOne('/api/products').flush(null, { status: 503, statusText: 'Unavailable' });
    expect(state.busy('/api/products')).toBe(true);
    await vi.advanceTimersByTimeAsync(1500);
    backend.expectOne('/api/products').flush({ data: [] });
    expect(state.busy('/api/products')).toBe(false);
  });
  it('bounds hanging requests and allows a fresh manual retry', async () => {
    const failed = vi.fn();
    http.get('/api/categories').subscribe({ error: failed });
    const first = backend.expectOne('/api/categories');
    await vi.advanceTimersByTimeAsync(26500);
    expect(first.cancelled).toBe(true);
    backend.expectOne('/api/categories');
    await vi.advanceTimersByTimeAsync(28000);
    backend.expectOne('/api/categories');
    await vi.advanceTimersByTimeAsync(25000);
    expect(failed).toHaveBeenCalledOnce();
    expect(state.failed('/api/categories')).toBe(true);
    expect(state.busy('/api/categories')).toBe(false);
    http.get('/api/categories').subscribe();
    expect(state.failed('/api/categories')).toBe(false);
    backend.expectOne('/api/categories').flush({ data: [] });
  });
  it('does not retry missing products or order writes', () => {
    http.get('/api/products/missing').subscribe({ error: () => {} });
    backend.expectOne('/api/products/missing').flush(null, { status: 404, statusText: 'Not found' });
    expect(state.failed('/api/products/missing')).toBe(true);
    http.post('/api/orders', {}).subscribe({ error: () => {} });
    backend.expectOne('/api/orders').flush(null, { status: 503, statusText: 'Unavailable' });
    expect(vi.getTimerCount()).toBe(0);
  });
});
