import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CategoryService } from '../services/category.service';
import { ProductService } from '../services/product.service';
import { StoreService } from '../services/store.service';
import { categories as mockCategories } from '../data/categories-data';
import { routes } from '../app.routes';
import { CatalogPageComponent } from './catalog-page';
import { ProductDetailPageComponent } from './product-detail-page';

const apiProducts = mockCategories.map((category, index) => ({
  id: `product-${index}`,
  slug: `test-${category.slug}`,
  name: { ar: `منتج ${index}`, en: index === 0 ? 'Layla' : `Product ${index}` },
  description: { ar: 'وصف كامل', en: 'Full description' },
  shortDescription: { ar: 'وصف مختصر', en: 'Short description' },
  price: index === 0 ? 169 : 250 + index,
  originalPrice: index === 0 ? 210 : 300 + index,
  rating: 4.8,
  reviewCount: 12,
  createdAt: `2026-03-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
  stock: 5,
  category: category.id,
  colors: ['#8B5E3C'],
  variants: [{ id: `variant-${index}`, color: { ar: 'بني', en: 'Brown' }, hex: '#8B5E3C', stock: 5 }],
  images: ['https://example.com/product.jpg'],
  features: [],
}));

describe('CatalogPageComponent', () => {
  let harness: RouterTestingHarness;
  let component: CatalogPageComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.removeItem('rabah-cart');
    localStorage.removeItem('rabah-wishlist');
    await TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    harness = await RouterTestingHarness.create();
    http = TestBed.inject(HttpTestingController);
    component = await harness.navigateByUrl('/catalog', CatalogPageComponent);
    http.expectOne('/api/categories').error(new ProgressEvent('Network error'));
    expect(TestBed.inject(ProductService).products()).toEqual([]);
    http.expectOne('/api/products?limit=120&page=1').flush({
      success: true,
      data: apiProducts,
      meta: { total: apiProducts.length, limit: 120 },
    });
    http.expectOne('/api/store-settings').flush({
      success: true,
      data: { storeName: 'RABAH', logoUrl: '', currency: 'EGP', deliveryFee: 25, freeShippingThreshold: 1000, announcement: { ar: '', en: '', isActive: false } },
    });
    harness.detectChanges();
  });

  afterEach(() => http.verify());

  it('provides products for every requested category', () => {
    const categories = TestBed.inject(CategoryService).categories();
    const products = TestBed.inject(ProductService).products();

    expect(categories.map((category) => category.id)).toEqual([
      'bags',
      'accessories',
      'wallets',
      'makeup',
      'nails',
      'hair-accessories',
      'girly-essentials',
      'gifts',
    ]);
    expect(
      categories.every((category) =>
        products.some(
          (product) =>
            product.category === category.id ||
            product.additionalCategories?.includes(category.id),
        ),
      ),
    ).toBe(true);
  });

  it('routes each category ID to its matching products', async () => {
    for (const category of TestBed.inject(CategoryService).categories()) {
      const page = await harness.navigateByUrl(`/catalog/${category.id}`, CatalogPageComponent);
      expect(page.filteredProducts().length).toBeGreaterThan(0);
      expect(
        page.filteredProducts().every(
          (product) =>
            product.category === category.id ||
            product.additionalCategories?.includes(category.id),
        ),
      ).toBe(true);
    }

    const queryPage = await harness.navigateByUrl(
      '/catalog?category=wallets',
      CatalogPageComponent,
    );
    expect(queryPage.filteredProducts().every((product) => product.category === 'wallets')).toBe(
      true,
    );
  });

  it('resolves every product detail route', async () => {
    for (const product of TestBed.inject(ProductService).products()) {
      const page = await harness.navigateByUrl(
        `/product/${product.slug}`,
        ProductDetailPageComponent,
      );
      expect(page.product()?.id).toBe(product.id);
    }
  });

  it('filters by name, price, color and sort order', () => {
    const root = harness.routeNativeElement!;
    const search = root.querySelector<HTMLInputElement>('.search-field input')!;
    search.value = 'Layla';
    search.dispatchEvent(new Event('input'));
    harness.detectChanges();
    expect(root.querySelectorAll('app-product-card').length).toBe(1);

    search.value = '';
    search.dispatchEvent(new Event('input'));
    const price = root.querySelectorAll<HTMLSelectElement>('.select-filter select')[0];
    price.value = 'under-200';
    price.dispatchEvent(new Event('change'));
    harness.detectChanges();
    expect(component.filteredProducts().every((product) => product.price < 200)).toBe(true);

    price.value = 'all';
    price.dispatchEvent(new Event('change'));
    const color = root.querySelector<HTMLButtonElement>('button[title="#8B5E3C"]')!;
    color.click();
    harness.detectChanges();
    expect(
      component.filteredProducts().every((product) => product.colors.includes('#8B5E3C')),
    ).toBe(true);

    root.querySelector<HTMLButtonElement>('.color-swatch.all-colors')!.click();
    const sort = root.querySelectorAll<HTMLSelectElement>('.select-filter select')[1];
    sort.value = 'price-descending';
    sort.dispatchEvent(new Event('change'));
    harness.detectChanges();
    const prices = component.filteredProducts().map((product) => product.price);
    expect(prices).toEqual([...prices].sort((first, second) => second - first));
  });

  it('toggles wishlist items and requires a color choice before adding a variant product', async () => {
    const root = harness.routeNativeElement!;
    const productId = component.filteredProducts()[0].id;
    const productUrl = root
      .querySelector<HTMLAnchorElement>('.product-name')!
      .getAttribute('href')!;
    root.querySelector<HTMLButtonElement>('.favorite-button')!.click();
    harness.detectChanges();
    expect(TestBed.inject(StoreService).isWishlisted(productId)).toBe(true);

    root.querySelector<HTMLButtonElement>('.add-button')!.click();
    expect(
      TestBed.inject(StoreService)
        .cart()
        .some((item) => item.productId === productId),
    ).toBe(false);

    const productPage = await harness.navigateByUrl(productUrl, ProductDetailPageComponent);
    expect(productPage.product()?.id).toBe(productId);
  });

  it('clears filters from the empty state', () => {
    const root = harness.routeNativeElement!;
    const search = root.querySelector<HTMLInputElement>('.search-field input')!;
    search.value = 'no-such-product';
    search.dispatchEvent(new Event('input'));
    harness.detectChanges();
    expect(root.querySelector('.empty-state')).not.toBeNull();

    root.querySelector<HTMLButtonElement>('.reset-button')!.click();
    harness.detectChanges();
    expect(component.searchQuery()).toBe('');
    expect(component.filteredProducts().length).toBe(
      TestBed.inject(ProductService).products().length,
    );
  });
});
