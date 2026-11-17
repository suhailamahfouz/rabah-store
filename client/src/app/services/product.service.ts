import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, finalize, shareReplay } from 'rxjs';
import { Product } from '../models/store';

const CATALOG_PAGE_SIZE = 24;

interface ProductApiRecord {
  id: string;
  slug: string;
  name: { ar: string; en: string };
  description: { ar: string; en: string };
  shortDescription: { ar: string; en: string };
  price: number;
  originalPrice: number;
  salePrice?: number;
  rating: number;
  reviewCount: number;
  createdAt: string;
  stock: number;
  category: string;
  badge?: { ar: string; en: string };
  colors: string[];
  variants: Array<{
    id: string;
    color: { ar: string; en: string };
    hex?: string;
    stock: number;
  }>;
  images: string[];
  features: Array<{ ar: string; en: string }>;
  isBestSeller?: boolean;
}

interface ProductListResponse {
  success: true;
  data: ProductApiRecord[];
  meta: { page: number; limit: number; total: number };
}

interface ProductResponse {
  success: true;
  data: ProductApiRecord;
}

/**
 * Catalog data is loaded only by the routes that need it. The service shares
 * identical in-flight requests and retains their result for the current app
 * session, avoiding duplicate requests while a visitor navigates around.
 */
@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly requestCache = new Map<string, Observable<ProductListResponse | ProductResponse>>();
  private readonly loadedCatalogPages = new Set<number>();
  private readonly loadingCatalogPages = new Set<number>();
  private readonly detailProducts = signal<Product[]>([]);
  private generation = 0;

  readonly products = signal<Product[]>([]);
  readonly error = signal('');
  readonly total = signal(0);
  readonly loading = signal(false);
  private readonly loadedCatalogCount = signal(0);
  readonly hasMore = computed(() => this.loadedCatalogCount() < this.total());

  /** First catalog page is also the six-card selection on the home page. */
  loadHomeProducts(): void {
    this.loadCatalogPage(1);
  }

  loadCatalog(): void {
    this.loadCatalogPage(1);
  }

  /** Category pages must not filter only the first page of the whole store. */
  loadCategory(slug: string): void {
    const generation = this.generation;
    const loadPage = (page: number): void => {
      const params = new HttpParams().set('category', slug)
        .set('limit', CATALOG_PAGE_SIZE).set('page', page);
      this.http.get<ProductListResponse>('/api/products', {
        params, headers: { 'Cache-Control': 'no-cache' },
      }).subscribe({
        next: ({ data, meta }) => {
          if (generation !== this.generation) return;
          const loaded = new Map(this.products().map((product) => [product.id, product]));
          for (const record of data) loaded.set(record.id, this.toProduct(record));
          this.products.set([...loaded.values()]);
          this.error.set('');
          if (data.length && page * meta.limit < meta.total) loadPage(page + 1);
        },
        error: () => this.error.set('Unable to load category products from the server.'),
      });
    };
    loadPage(1);
  }

  loadNextPage(): void {
    if (!this.hasMore()) return;
    const lastLoadedPage = Math.max(0, ...this.loadedCatalogPages);
    this.loadCatalogPage(lastLoadedPage + 1);
  }

  reload(): void {
    this.generation += 1;
    this.requestCache.clear();
    this.loadedCatalogPages.clear();
    this.loadingCatalogPages.clear();
    this.products.set([]);
    this.detailProducts.set([]);
    this.total.set(0);
    this.loadedCatalogCount.set(0);
    this.error.set('');
    this.loading.set(false);
    this.loadCatalogPage(1);
  }

  loadBySlug(slug: string): void {
    const normalizedSlug = slug.trim().toLowerCase();
    if (!normalizedSlug) return;

    const url = `/api/products/${encodeURIComponent(normalizedSlug)}`;
    this.http.get<ProductResponse>(url, { headers: { 'Cache-Control': 'no-cache' } }).subscribe({
      next: ({ data }) => this.rememberProducts([this.toProduct(data)]),
      error: () => this.error.set('Unable to load this product from the server.'),
    });
  }

  /** Restores cart items after a refresh without downloading the whole catalog. */
  loadByIds(ids: readonly string[]): void {
    const missingIds = [...new Set(ids.filter((id) => /^[a-f\d]{24}$/i.test(id) && !this.getById(id)))];
    if (!missingIds.length) return;

    const params = new HttpParams()
      .set('ids', missingIds.join(','))
      .set('limit', String(missingIds.length));
    const url = `/api/products?${params.toString()}`;
    this.request<ProductListResponse>(url).subscribe({
      next: ({ data }) => this.rememberProducts(data.map((product) => this.toProduct(product))),
      error: () => this.error.set('Unable to load saved cart products from the server.'),
    });
  }

  getBySlug(slug: string): Product | undefined {
    return this.knownProducts().find((product) => product.slug === slug);
  }

  getById(id: string): Product | undefined {
    return this.knownProducts().find((product) => product.id === id);
  }

  private loadCatalogPage(page: number): void {
    if (this.loadedCatalogPages.has(page) || this.loadingCatalogPages.has(page)) return;
    const generation = this.generation;

    this.loadingCatalogPages.add(page);
    this.loading.set(true);
    const url = `/api/products?limit=${CATALOG_PAGE_SIZE}&page=${page}`;
    this.request<ProductListResponse>(url).pipe(
      finalize(() => {
        if (generation !== this.generation) return;
        this.loadingCatalogPages.delete(page);
        this.loading.set(this.loadingCatalogPages.size > 0);
      }),
    ).subscribe({
      next: ({ data, meta }) => {
        if (generation !== this.generation) return;
        const loaded = new Map(this.products().map((product) => [product.id, product]));
        for (const record of data) {
          const product = this.toProduct(record);
          loaded.set(product.id, product);
        }
        this.products.set([...loaded.values()]);
        this.loadedCatalogPages.add(page);
        this.loadedCatalogCount.update(count => count + data.length);
        this.total.set(meta.total);
        this.error.set('');
      },
      error: () => this.error.set('Unable to load store products from the server.'),
    });
  }

  private request<T extends ProductListResponse | ProductResponse>(url: string): Observable<T> {
    const existing = this.requestCache.get(url) as Observable<T> | undefined;
    if (existing) return existing;

    const request = this.http.get<T>(url, { headers: { 'Cache-Control': 'no-cache' } }).pipe(shareReplay({ bufferSize: 1, refCount: false }));
    this.requestCache.set(url, request);
    return request;
  }

  private knownProducts(): Product[] {
    const known = new Map<string, Product>();
    for (const product of [...this.products(), ...this.detailProducts()]) known.set(product.id, product);
    return [...known.values()];
  }

  private rememberProducts(products: Product[]): void {
    const known = new Map(this.detailProducts().map((product) => [product.id, product]));
    for (const product of products) known.set(product.id, product);
    this.detailProducts.set([...known.values()]);
  }

  private toProduct(product: ProductApiRecord): Product {
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      shortDescription: product.shortDescription,
      price: product.price,
      originalPrice: product.salePrice == null ? undefined : product.originalPrice,
      rating: product.rating,
      reviewCount: product.reviewCount,
      createdAt: product.createdAt,
      stock: product.stock,
      category: product.category,
      badge: product.badge,
      colors: product.colors,
      variants: product.variants,
      images: product.images,
      features: product.features,
      isBestSeller: Boolean(product.isBestSeller),
    };
  }
}
