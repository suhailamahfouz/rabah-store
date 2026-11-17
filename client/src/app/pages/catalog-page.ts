import { StorefrontSkeletonComponent } from '../components/storefront-skeleton';
import { StorefrontLoadingService } from '../services/storefront-loading.service';
import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductCardComponent } from '../components/product-card';
import { Product } from '../models/store';
import { CategoryService } from '../services/category.service';
import { ProductService } from '../services/product.service';
import { StoreService } from '../services/store.service';

type PriceFilter = 'all' | 'under-200' | '200-350' | 'over-350';
type SortOrder = 'newest' | 'price-ascending' | 'price-descending';

@Component({
  selector: 'app-catalog-page',
  standalone: true,
  imports: [StorefrontSkeletonComponent, CommonModule, ProductCardComponent],
  templateUrl: './catalog-page.html',
  styleUrl: './catalog-page.scss',
})
export class CatalogPageComponent {
  readonly network = inject(StorefrontLoadingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly store = inject(StoreService);
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);

  readonly categories = this.categoryService.categories;
  readonly products = this.productService.products;
  readonly lang = this.store.lang;
  readonly currency = this.store.currency;
  readonly loading = this.productService.loading;
  readonly hasMore = this.productService.hasMore;
  retryProducts(): void {
    if (this.categoryId() === 'all') {
      if (this.products().length && this.hasMore()) this.productService.loadNextPage();
      else this.productService.loadCatalog();
    }
    else this.productService.loadCategory(this.categoryId());
  }
  loadMore(): void { this.productService.loadNextPage(); }
  readonly categoryId = signal('all');
  readonly requestPrefix = computed(() => this.categoryId() === 'all' ? '/api/products?limit=24&page=' : '/api/products?category=' + encodeURIComponent(this.categoryId()) + '&');
  readonly searchQuery = signal('');
  readonly priceFilter = signal<PriceFilter>('all');
  readonly sortOrder = signal<SortOrder>('newest');

  readonly heroImage = computed(() => {
    const categoryId = this.categoryId();
    const category = this.categoryService.getById(categoryId);
    const selectedCategoryId = category?.id ?? categoryId;
    return (
      this.products().find(
        (product) =>
          categoryId === 'all' ||
          product.category === selectedCategoryId ||
          product.additionalCategories?.includes(selectedCategoryId),
      )
        ?.images[0] ??
      this.products()[0]?.images[0] ??
      ''
    );
  });
  readonly activeCategory = computed(() =>
    this.categoryId() === 'all' ? undefined : this.categoryService.getById(this.categoryId()),
  );
  readonly filteredProducts = computed(() => {
    const query = this.searchQuery().trim().toLocaleLowerCase();
    const categoryId = this.categoryId();
    const selectedCategoryId = this.categoryService.getById(categoryId)?.id ?? categoryId;
    const priceFilter = this.priceFilter();
    const products = this.products().filter((product) => {
      const matchesCategory =
        categoryId === 'all' ||
        product.category === selectedCategoryId ||
        product.additionalCategories?.includes(selectedCategoryId);
      const matchesPrice =
        priceFilter === 'all' ||
        (priceFilter === 'under-200' && product.price < 200) ||
        (priceFilter === '200-350' && product.price >= 200 && product.price <= 350) ||
        (priceFilter === 'over-350' && product.price > 350);
      const category = this.categoryService.getById(product.category);
      const searchableText = [
        product.name.ar,
        product.name.en,
        product.shortDescription.ar,
        product.shortDescription.en,
        category?.label.ar ?? '',
        category?.label.en ?? '',
      ]
        .join(' ')
        .toLocaleLowerCase();

      return (
        matchesCategory &&
        matchesPrice &&
        (!query || searchableText.includes(query))
      );
    });

    return products.sort((first, second) => {
      if (this.sortOrder() === 'price-ascending') {
        return first.price - second.price;
      }
      if (this.sortOrder() === 'price-descending') {
        return second.price - first.price;
      }
      return second.createdAt.localeCompare(first.createdAt);
    });
  });

  constructor() {
    this.productService.loadCatalog();
    effect(() => {
      const selected = this.categoryId();
      const category = this.categoryService.getById(selected);
      if (selected !== 'all' && category) {
        untracked(() => this.productService.loadCategory(category.slug));
      }
    });
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const routeCategory = params.get('categoryId');
      this.categoryId.set(routeCategory ?? 'all');
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      if (this.route.snapshot.paramMap.has('categoryId')) {
        return;
      }

      const queryCategory = params.get('category');
      this.categoryId.set(queryCategory ?? 'all');
    });
  }

  selectCategory(categoryId: string): void {
    if (categoryId === 'all') {
      void this.router.navigate(['/catalog']);
      return;
    }

    const category = this.categoryService.getById(categoryId);
    void this.router.navigate(['/catalog', category?.slug ?? categoryId]);
  }

  setSearchQuery(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  setPriceFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value === 'all' || value === 'under-200' || value === '200-350' || value === 'over-350') {
      this.priceFilter.set(value);
    }
  }

  setSortOrder(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value === 'newest' || value === 'price-ascending' || value === 'price-descending') {
      this.sortOrder.set(value);
    }
  }


  clearFilters(): void {
    this.searchQuery.set('');
    this.priceFilter.set('all');
    this.sortOrder.set('newest');
    this.selectCategory('all');
  }

  toggleWishlist(productId: string): void {
    this.store.toggleWishlist(productId);
  }

  addToCart(productId: string): void {
    const product = this.store.getProductById(productId);
    if (product?.colorOptions?.length) { void this.router.navigate(['/product', product.slug]); return; }
    this.store.addToCart(productId);
  }

  isWishlisted(productId: string): boolean {
    return this.store.isWishlisted(productId);
  }

  categoryLabel(product: Product): string {
    const category = this.categoryService.getById(this.categoryId());
    const displayedCategory = category &&
      (product.category === category.id || product.additionalCategories?.includes(category.id))
      ? category.id
      : product.category;
    return this.categoryService.getById(displayedCategory)?.label[this.lang()] ?? '';
  }
}
