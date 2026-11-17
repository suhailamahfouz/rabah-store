import { StorefrontSkeletonComponent } from '../components/storefront-skeleton';
import { StorefrontLoadingService } from '../services/storefront-loading.service';
import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, computed, ElementRef, inject, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CategoryCardComponent } from '../components/category-card';
import { StoreService } from '../services/store.service';
import { CategoryService } from '../services/category.service';
import { ProductService } from '../services/product.service';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [StorefrontSkeletonComponent, CommonModule, RouterLink, CategoryCardComponent],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePageComponent implements AfterViewInit {
  readonly network = inject(StorefrontLoadingService);
  private readonly store = inject(StoreService);
  private readonly productsApi = inject(ProductService);
  private readonly categoriesApi = inject(CategoryService);
  constructor() { this.productsApi.loadHomeProducts(); }
  retryProducts(): void { this.productsApi.loadHomeProducts(); }
  retryCategories(): void { this.categoriesApi.reload(); }

  readonly categories = this.store.categories;
  readonly featuredProducts = this.store.featuredProducts;
  readonly lang = this.store.lang;
  readonly currency = this.store.currency;
  readonly heroPoster = computed(() => this.store.storeSettings().hero?.posterUrl || '/logo-gold.png');
  readonly promoBanner = computed(() => this.store.storeSettings().promoBanner);
  readonly featuredCollection = computed(() => this.store.storeSettings().featuredCollection);
  readonly featuredCollectionLink = computed(() => {
    const link = this.featuredCollection()?.link;
    return !link || link === '/shop' ? '/catalog' : link;
  });
  videoUnavailable = false;

  @ViewChild('productCarousel') private productCarousel?: ElementRef<HTMLElement>;
  @ViewChild('heroVideo') private heroVideo?: ElementRef<HTMLVideoElement>;
  @ViewChildren('mobileVideo') private mobileVideos?: QueryList<ElementRef<HTMLVideoElement>>;

  ngAfterViewInit(): void {
    const video = this.heroVideo?.nativeElement;
    if (!video) return;

    video.muted = true;
    if (window.matchMedia('(max-width: 640px)').matches) {
      video.pause();
      this.mobileVideos?.forEach(({ nativeElement }) => {
        nativeElement.muted = true;
        nativeElement.playsInline = true;
        nativeElement.play().catch(() => {
          this.videoUnavailable = true;
        });
      });
      return;
    }

    video.play().catch(() => {
      this.videoUnavailable = true;
    });
  }

  onMobileVideoError(): void {
    this.videoUnavailable = true;
  }

  scrollProducts(direction: -1 | 1): void {
    const carousel = this.productCarousel?.nativeElement;
    if (!carousel) return;

    carousel.scrollBy({ left: direction * carousel.clientWidth * 0.8, behavior: 'smooth' });
  }
}
