import { StorefrontSkeletonComponent } from '../components/storefront-skeleton';
import { StorefrontLoadingService } from '../services/storefront-loading.service';
import { CommonModule } from '@angular/common';
import { Component, computed, ElementRef, inject, signal, ViewChild, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { StoreService } from '../services/store.service';
import { ProductService } from '../services/product.service';

@Component({
  selector: 'app-product-detail-page',
  standalone: true,
  imports: [StorefrontSkeletonComponent, CommonModule],
  template: `
    <div class="container" *ngIf="!product()">
      <app-storefront-skeleton [lang]="lang()" [detail]="true" [failed]="!network.busy(productRequest()) && network.failed(productRequest())" (retry)="retryProduct()" />
    </div>
    <section class="container product-page" *ngIf="product() as selectedProduct">
      <div class="gallery">
        <button *ngIf="selectedProduct.images.length" class="image-button" type="button" (click)="openImage(selectedImage())" [attr.aria-label]="lang() === 'ar' ? 'تكبير صورة المنتج' : 'Enlarge product image'">
          <img [src]="selectedProduct.images[selectedImage()] || selectedProduct.images[0]" [alt]="selectedProduct.name[lang()]" class="main-image" />
        </button>
        <div class="thumbs">
          <button *ngFor="let image of selectedProduct.images; let i = index" class="image-button" type="button" [class.selected]="selectedImage() === i" (click)="openImage(i)" [attr.aria-label]="(lang() === 'ar' ? 'فتح الصورة ' : 'Open image ') + (i + 1)">
            <img [src]="image" [alt]="selectedProduct.name[lang()]" loading="lazy" />
          </button>
        </div>
      </div>

      <dialog #imageViewer class="image-viewer" [attr.aria-label]="selectedProduct.name[lang()]" (click)="closeOnBackdrop($event)" (keydown.arrowright)="stepImage(lang() === 'ar' ? -1 : 1); $event.preventDefault()" (keydown.arrowleft)="stepImage(lang() === 'ar' ? 1 : -1); $event.preventDefault()">
        <button class="viewer-close" type="button" autofocus (click)="closeImage()" [attr.aria-label]="lang() === 'ar' ? 'إغلاق الصورة' : 'Close image'">×</button>
        <img [src]="selectedProduct.images[selectedImage()]" [alt]="selectedProduct.name[lang()]" />
        <div class="viewer-controls" *ngIf="selectedProduct.images.length > 1">
          <button type="button" (click)="stepImage(-1)">{{ lang() === 'ar' ? 'السابق' : 'Previous' }}</button>
          <span aria-live="polite">{{ selectedImage() + 1 }} / {{ selectedProduct.images.length }}</span>
          <button type="button" (click)="stepImage(1)">{{ lang() === 'ar' ? 'التالي' : 'Next' }}</button>
        </div>
      </dialog>

      <div class="details">
        <span class="eyebrow">{{ selectedProduct.badge?.[lang()] || 'RABAH' }}</span>
        <h1>{{ selectedProduct.name[lang()] }}</h1>

        <div class="price-row">
          <strong>{{ selectedProduct.price }} {{ currency() }}</strong>
          <span *ngIf="selectedProduct.originalPrice">{{ selectedProduct.originalPrice }} {{ currency() }}</span>
        </div>

        <p class="description">{{ selectedProduct.description[lang()] }}</p>

        <div class="purchase-row">
          <div class="qty-selector">
            <button type="button" [disabled]="quantity() <= 1" [attr.aria-label]="lang() === 'ar' ? 'تقليل الكمية' : 'Decrease quantity'" (click)="decrementQty()">−</button>
            <span>{{ quantity() }}</span>
            <button type="button" [disabled]="quantity() >= availableStock()" [attr.aria-label]="lang() === 'ar' ? 'زيادة الكمية' : 'Increase quantity'" (click)="incrementQty()">＋</button>
          </div>
          <button type="button" class="primary-btn" [disabled]="!canAddToCart()" (click)="addToCart()">
            {{ purchaseLabel() }}
          </button>
        </div>
        <p class="purchase-status" role="status" *ngIf="!canAddToCart()">{{ purchaseStatus() }}</p>

        <div class="feature-list">
          <div *ngFor="let feature of selectedProduct.features" class="feature-item">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7"></path></svg>
            <span>{{ feature[lang()] }}</span>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .container {
        width: min(1200px, calc(100% - 2rem));
        margin: 0 auto;
      }

      .product-page {
        display: grid;
        grid-template-columns: 1.05fr 0.95fr;
        gap: 2rem;
        padding: 2.5rem 0 4rem;
      }

      .gallery {
        display: grid;
        gap: 1rem;
      }

      .image-button { display: block; width: 100%; min-width: 0; padding: 0; border: 0; border-radius: 1rem; background: transparent; cursor: zoom-in; }
      .image-button img { display: block; }
      .image-button:focus-visible, .thumbs .selected { outline: 2px solid #8d573c; outline-offset: 3px; }
      .image-viewer { width: min(1000px, calc(100vw - 2rem)); max-height: 92dvh; box-sizing: border-box; padding: 3.5rem 1rem 1rem; border: 0; border-radius: 1.2rem; background: #fffdf9; color: #29221f; }
      .image-viewer::backdrop { background: rgba(0, 0, 0, .8); }
      .image-viewer > img { display: block; width: 100%; height: min(70dvh, 800px); object-fit: contain; }
      .viewer-close { position: absolute; top: .5rem; inset-inline-end: .5rem; width: 2.5rem; height: 2.5rem; border: 0; border-radius: 50%; font-size: 1.7rem; cursor: pointer; }
      .viewer-controls { display: flex; align-items: center; justify-content: center; gap: 1rem; margin-top: 1rem; }
      .viewer-controls button { padding: .6rem 1rem; border: 1px solid #e6d9cd; border-radius: 999px; background: #f7f3ed; color: inherit; cursor: pointer; }

      .main-image {
        width: 100%;
        height: 620px;
        object-fit: cover;
        border-radius: 2rem;
        box-shadow: 0 18px 40px rgba(32, 23, 16, 0.12);
      }

      .thumbs {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.8rem;
      }

      .thumbs img {
        width: 100%;
        height: 120px;
        object-fit: cover;
        border-radius: 1rem;
      }

      .details {
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      .eyebrow {
        font-size: 0.76rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #8d573c;
        font-weight: 700;
      }

      h1 {
        margin: 0.75rem 0 0.5rem;
        font-size: clamp(2rem, 3vw, 3rem);
      }

      .price-row,
      .purchase-row {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .price-row {
        margin-bottom: 1rem;
      }

      .price-row strong {
        font-size: 2rem;
      }

      .price-row span {
        color: #8a8988;
        text-decoration: line-through;
      }

      .description {
        line-height: 1.8;
        color: #564e4b;
        margin: 0 0 1.5rem;
      }

      .primary-btn:disabled {
        cursor: not-allowed;
        opacity: 0.48;
      }

      .purchase-status { margin: .75rem 0 0; color: #82776e; font-size: .9rem; line-height: 1.7; }
      .qty-selector button:disabled { opacity: .4; cursor: not-allowed; }

      .qty-selector {
        display: inline-flex;
        align-items: center;
        gap: 0.75rem;
        background: #f8f3ee;
        border-radius: 999px;
        padding: 0.35rem 0.7rem;
      }

      .qty-selector button {
        border: none;
        background: transparent;
        font-size: 1.35rem;
        cursor: pointer;
      }

      .primary-btn {
        border: none;
        background: linear-gradient(135deg, #8d573c, #d3a06f);
        color: white;
        padding: 0.9rem 1.4rem;
        border-radius: 999px;
        font-weight: 700;
        cursor: pointer;
      }

      .feature-list {
        margin-top: 1.5rem;
        display: grid;
        gap: 0.75rem;
      }

      .feature-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        color: #433f3d;
      }

      .feature-item svg {
        width: 1rem;
        height: 1rem;
        flex: 0 0 auto;
        fill: none;
        stroke: #96794f;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 1.8;
      }

      @media (max-width: 860px) {
        .product-page {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ProductDetailPageComponent {
  readonly network = inject(StorefrontLoadingService);
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(StoreService);
  private readonly productsApi = inject(ProductService);
  private readonly destroyRef = inject(DestroyRef);
  @ViewChild('imageViewer') private imageViewer?: ElementRef<HTMLDialogElement>;
  readonly selectedImage = signal(0);

  private readonly slug = signal(this.route.snapshot.paramMap.get('slug') ?? '');
  readonly productRequest = computed(() => '/api/products/' + encodeURIComponent(this.slug().trim().toLowerCase()));
  retryProduct(): void { this.productsApi.loadBySlug(this.slug()); }
  readonly product = computed(() => this.store.getProductBySlug(this.slug()));
  readonly lang = this.store.lang;
  readonly currency = this.store.currency;
  readonly availableStock = computed(() => this.product()?.stock ?? 0);
  readonly canAddToCart = computed(() => !!this.product() && this.quantity() > 0 && this.availableStock() >= this.quantity());
  readonly quantity = signal(1);
  readonly purchaseLabel = computed(() => {
    const item = this.product();
    const ar = this.lang() === 'ar';
    if (!item || item.stock <= 0) {
      return ar ? 'نفد المخزون' : 'Out of stock';
    }
    return ar ? 'أضف إلى السلة' : 'Add to cart';
  });
  readonly purchaseStatus = computed(() => {
    const ar = this.lang() === 'ar';
    if ((this.product()?.stock ?? 0) <= 0) return ar ? 'هذا المنتج غير متوفر حاليًا.' : 'This product is currently out of stock.';
    return ar ? 'الكمية المطلوبة أكبر من المخزون المتاح. قلّلي الكمية.' : 'The quantity exceeds available stock. Reduce the quantity.';
  });

  constructor() {
    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.closeImage();
      this.selectedImage.set(0);
      this.slug.set(params['slug'] ?? '');
      this.productsApi.loadBySlug(this.slug());
      this.quantity.set(1);
    });
  }

  openImage(index: number): void {
    if (!this.product()?.images[index]) return;
    this.selectedImage.set(index);
    this.imageViewer?.nativeElement.showModal();
  }

  closeImage(): void {
    this.imageViewer?.nativeElement.close();
  }

  closeOnBackdrop(event: MouseEvent): void {
    if (event.target === this.imageViewer?.nativeElement) this.closeImage();
  }

  stepImage(step: number): void {
    const count = this.product()?.images.length ?? 0;
    if (count) this.selectedImage.update((index) => (index + step + count) % count);
  }

  incrementQty(): void {
    const stock = this.availableStock();
    if (stock < 1) return;
    this.quantity.update((value) => Math.min(value + 1, stock));
  }

  decrementQty(): void {
    this.quantity.update((value) => Math.max(1, value - 1));
  }

  addToCart(): void {
    const item = this.product();
    if (!item || !this.canAddToCart()) {
      return;
    }

    this.store.addToCart(item.id, this.quantity());
  }
}
