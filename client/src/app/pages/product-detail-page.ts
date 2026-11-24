import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ColorSwatchesComponent } from '../components/color-swatches';
import { StorefrontSkeletonComponent } from '../components/storefront-skeleton';
import { Product } from '../models/store';
import { ProductService } from '../services/product.service';
import { StorefrontLoadingService } from '../services/storefront-loading.service';
import { StoreService } from '../services/store.service';

@Component({
  selector: 'app-product-detail-page',
  standalone: true,
  imports: [CommonModule, ColorSwatchesComponent, StorefrontSkeletonComponent],
  template: `
    <div class="container" *ngIf="!product()">
      <app-storefront-skeleton
        [lang]="lang()"
        [detail]="true"
        [failed]="!network.busy(productRequest()) && network.failed(productRequest())"
        (retry)="retryProduct()"
      />
    </div>

    <section
      class="container product-page"
      *ngIf="product() as selectedProduct"
      [attr.dir]="lang() === 'ar' ? 'rtl' : 'ltr'"
    >
      <div class="gallery">
        <div class="media-stage">
          <button
            *ngIf="selectedProduct.images.length"
            class="image-button"
            type="button"
            (click)="openImage(selectedImage())"
            [attr.aria-label]="lang() === 'ar' ? 'تكبير صورة المنتج' : 'Enlarge product image'"
          >
            <img
              class="main-image"
              [src]="selectedProduct.images[selectedImage()] || selectedProduct.images[0]"
              [alt]="selectedProduct.name[lang()]"
            />
            <span class="zoom-icon" aria-hidden="true"
              ><svg viewBox="0 0 24 24">
                <circle cx="10.8" cy="10.8" r="5.8"></circle>
                <path d="m15.2 15.2 4.2 4.2M10.8 8v5.6M8 10.8h5.6"></path></svg
            ></span>
          </button>
          <div *ngIf="!selectedProduct.images.length" class="image-empty">
            {{ lang() === 'ar' ? 'لا توجد صورة متاحة' : 'Image coming soon' }}
          </div>
          <button
            *ngIf="selectedProduct.images.length > 1"
            class="gallery-arrow previous"
            type="button"
            (click)="stepImage(-1)"
            [attr.aria-label]="lang() === 'ar' ? 'الصورة السابقة' : 'Previous image'"
          >
            ‹
          </button>
          <button
            *ngIf="selectedProduct.images.length > 1"
            class="gallery-arrow next"
            type="button"
            (click)="stepImage(1)"
            [attr.aria-label]="lang() === 'ar' ? 'الصورة التالية' : 'Next image'"
          >
            ›
          </button>
        </div>
        <div class="gallery-navigation" *ngIf="selectedProduct.images.length > 1">
          <div class="thumbs">
            <button
              *ngFor="let image of selectedProduct.images; let i = index"
              class="thumb-button"
              type="button"
              [class.selected]="selectedImage() === i"
              (click)="openImage(i)"
              [attr.aria-label]="(lang() === 'ar' ? 'عرض الصورة ' : 'Show image ') + (i + 1)"
            >
              <img [src]="image" [alt]="selectedProduct.name[lang()]" loading="lazy" />
            </button>
          </div>
          <p class="image-count" aria-live="polite">
            {{ selectedImage() + 1 }} <span>/</span> {{ selectedProduct.images.length }}
          </p>
        </div>
      </div>

      <dialog
        #imageViewer
        class="image-viewer"
        [attr.aria-label]="selectedProduct.name[lang()]"
        (click)="closeOnBackdrop($event)"
        (keydown.arrowright)="stepImage(lang() === 'ar' ? -1 : 1); $event.preventDefault()"
        (keydown.arrowleft)="stepImage(lang() === 'ar' ? 1 : -1); $event.preventDefault()"
      >
        <button
          class="viewer-close"
          type="button"
          autofocus
          (click)="closeImage()"
          [attr.aria-label]="lang() === 'ar' ? 'إغلاق الصورة' : 'Close image'"
        >
          ×
        </button>
        <img [src]="selectedProduct.images[selectedImage()]" [alt]="selectedProduct.name[lang()]" />
        <div class="viewer-controls" *ngIf="selectedProduct.images.length > 1">
          <button type="button" (click)="stepImage(-1)">
            {{ lang() === 'ar' ? 'السابق' : 'Previous' }}
          </button>
          <span>{{ selectedImage() + 1 }} / {{ selectedProduct.images.length }}</span>
          <button type="button" (click)="stepImage(1)">
            {{ lang() === 'ar' ? 'التالي' : 'Next' }}
          </button>
        </div>
      </dialog>

      <div class="details">
        <header class="product-heading">
          <span class="eyebrow">{{ selectedProduct.badge?.[lang()] || 'RABAH' }}</span>
          <button
            class="wishlist-button"
            type="button"
            [class.is-favorite]="isWishlisted(selectedProduct.id)"
            [attr.aria-pressed]="isWishlisted(selectedProduct.id)"
            (click)="toggleWishlist(selectedProduct.id)"
            [attr.aria-label]="lang() === 'ar' ? 'إضافة للمفضلة' : 'Add to favourites'"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M20.8 8.7c0 5.5-8.8 11-8.8 11s-8.8-5.5-8.8-11A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.5Z"
              ></path>
            </svg>
          </button>
        </header>
        <h1>{{ selectedProduct.name[lang()] }}</h1>
        <div
          class="product-rating"
          *ngIf="selectedProduct.rating"
          [attr.aria-label]="selectedProduct.rating + ' out of 5'"
        >
          <span class="stars" aria-hidden="true"
            ><span
              *ngFor="let star of ratingStars"
              [class.empty]="star > roundedRating(selectedProduct.rating)"
              >★</span
            ></span
          >
          <span *ngIf="selectedProduct.reviewCount"
            >{{ selectedProduct.reviewCount }}
            {{ selectedProduct.reviewCount === 1 ? 'rating' : 'ratings' }}</span
          >
        </div>
        <div class="price-row">
          <strong>{{ selectedProduct.price }} {{ currency() }}</strong
          ><span *ngIf="selectedProduct.originalPrice"
            >{{ selectedProduct.originalPrice }} {{ currency() }}</span
          >
        </div>

        <section class="product-colors" *ngIf="selectedProduct.colorOptions?.length">
          <p class="colors-label">
            {{ lang() === 'ar' ? 'اللون' : 'Colour' }}
            <span *ngIf="chosenColor()">— {{ chosenColor()!.name[lang()] }}</span>
          </p>
          <app-color-swatches
            [colors]="selectedProduct.colorOptions!"
            [selected]="[selectedColor()]"
            [lang]="lang()"
            (choose)="selectedColor.set($event.hex)"
          />
        </section>

        <div class="purchase-area">
          <div class="quantity-block">
            <span>{{ lang() === 'ar' ? 'الكمية' : 'Quantity' }}</span>
            <div class="qty-selector">
              <button
                type="button"
                [disabled]="quantity() <= 1"
                [attr.aria-label]="lang() === 'ar' ? 'تقليل الكمية' : 'Decrease quantity'"
                (click)="decrementQty()"
              >
                −
              </button>
              <span>{{ quantity() }}</span>
              <button
                type="button"
                [disabled]="quantity() >= availableStock()"
                [attr.aria-label]="lang() === 'ar' ? 'زيادة الكمية' : 'Increase quantity'"
                (click)="incrementQty()"
              >
                +
              </button>
            </div>
          </div>
          <div class="action-buttons">
            <button
              type="button"
              class="add-button primary-btn"
              [disabled]="!canAddToCart()"
              (click)="addToCart()"
            >
              {{ purchaseLabel() }}
            </button>
            <button
              type="button"
              class="buy-button"
              [disabled]="!canAddToCart()"
              (click)="buyNow()"
            >
              {{ lang() === 'ar' ? 'اشتري الآن' : 'Buy it now' }}
            </button>
          </div>
        </div>
        <p class="purchase-status" role="status" *ngIf="!canAddToCart()">{{ purchaseStatus() }}</p>

        <p class="description">{{ selectedProduct.description[lang()] }}</p>
        <button type="button" class="share-button" (click)="shareProduct(selectedProduct)">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 16V3m0 0L7.5 7.5M12 3l4.5 4.5M5 12v7h14v-7"></path></svg
          >{{ lang() === 'ar' ? 'مشاركة' : 'Share' }}
        </button>
        <p class="share-status" *ngIf="shareMessage()" role="status">{{ shareMessage() }}</p>
        <div class="feature-list" *ngIf="selectedProduct.features.length">
          <div *ngFor="let feature of selectedProduct.features" class="feature-item">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7"></path></svg
            ><span>{{ feature[lang()] }}</span>
          </div>
        </div>
      </div>
    </section>

    <section
      class="container related-products"
      *ngIf="relatedProducts().length"
      [attr.dir]="lang() === 'ar' ? 'rtl' : 'ltr'"
    >
      <div class="related-heading">
        <div>
          <span class="eyebrow">{{ lang() === 'ar' ? 'اختيارات لك' : 'Curated for you' }}</span>
          <h2>{{ lang() === 'ar' ? 'قد يعجبك أيضاً' : 'You may also like' }}</h2>
        </div>
        <button type="button" class="view-catalog" (click)="goToCatalog()">
          {{ lang() === 'ar' ? 'عرض الكل' : 'View all' }}
        </button>
      </div>
      <div class="related-grid">
        <button
          *ngFor="let related of relatedProducts()"
          type="button"
          class="related-card"
          (click)="goToProduct(related.slug)"
        >
          <img
            *ngIf="related.images[0]"
            [src]="related.images[0]"
            [alt]="related.name[lang()]"
            loading="lazy"
          />
          <span class="related-copy"
            ><strong>{{ related.name[lang()] }}</strong
            ><small>{{ related.price }} {{ currency() }}</small></span
          >
        </button>
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        padding-bottom: 4.5rem;
      }
      .container {
        width: min(1240px, calc(100% - 2.5rem));
        margin: 0 auto;
      }
      .product-page {
        display: grid;
        grid-template-columns: minmax(0, 1.07fr) minmax(340px, 0.93fr);
        gap: clamp(2.5rem, 7vw, 7rem);
        padding: clamp(2rem, 5vw, 5rem) 0 3.5rem;
      }
      .gallery {
        min-width: 0;
      }
      .media-stage {
        position: relative;
        overflow: hidden;
        border-radius: 1.5rem;
        background: #eee8e0;
      }
      .image-button {
        display: block;
        width: 100%;
        padding: 0;
        border: 0;
        background: transparent;
        cursor: zoom-in;
      }
      .main-image {
        display: block;
        width: 100%;
        aspect-ratio: 4/5;
        object-fit: cover;
        transition: transform 0.5s ease;
      }
      .image-button:hover .main-image {
        transform: scale(1.018);
      }
      .zoom-icon {
        position: absolute;
        top: 1.1rem;
        inset-inline-start: 1.1rem;
        display: grid;
        width: 2.75rem;
        height: 2.75rem;
        place-items: center;
        border-radius: 50%;
        background: #fffdf9ef;
        color: #2a2725;
        box-shadow: 0 4px 14px #1f16151c;
      }
      .zoom-icon svg,
      .share-button svg {
        width: 1.2rem;
        height: 1.2rem;
        fill: none;
        stroke: currentColor;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 1.6;
      }
      .image-empty {
        display: grid;
        min-height: 500px;
        place-items: center;
        color: #82776e;
      }
      .gallery-arrow {
        position: absolute;
        top: 50%;
        z-index: 1;
        display: grid;
        width: 2.5rem;
        height: 2.5rem;
        place-items: center;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: #fffdf9e6;
        color: #2a2725;
        font-family: Georgia, serif;
        font-size: 2rem;
        line-height: 1;
        cursor: pointer;
        transform: translateY(-50%);
        opacity: 0;
        transition: opacity 0.18s;
      }
      .previous {
        inset-inline-start: 1rem;
      }
      .next {
        inset-inline-end: 1rem;
      }
      .media-stage:hover .gallery-arrow,
      .gallery-arrow:focus-visible {
        opacity: 1;
      }
      .gallery-navigation {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-top: 1rem;
      }
      .thumbs {
        display: flex;
        gap: 0.65rem;
        overflow: auto;
        padding: 0.2rem;
      }
      .thumb-button {
        flex: 0 0 auto;
        width: 4.5rem;
        padding: 0;
        border: 1px solid transparent;
        border-radius: 0.65rem;
        background: none;
        cursor: pointer;
        opacity: 0.58;
      }
      .thumb-button img {
        display: block;
        width: 100%;
        aspect-ratio: 1;
        border-radius: 0.55rem;
        object-fit: cover;
      }
      .thumb-button:hover,
      .thumb-button.selected {
        border-color: #4a3934;
        opacity: 1;
      }
      .image-count {
        flex: 0 0 auto;
        margin: 0;
        color: #675d58;
        font-size: 0.82rem;
        letter-spacing: 0.08em;
      }
      .image-count span {
        color: #b4aaa2;
      }
      .image-button:focus-visible,
      .thumb-button:focus-visible,
      .gallery-arrow:focus-visible,
      .wishlist-button:focus-visible,
      .share-button:focus-visible,
      .view-catalog:focus-visible,
      .related-card:focus-visible {
        outline: 2px solid #6d402d;
        outline-offset: 3px;
      }
      .image-viewer {
        width: min(1000px, calc(100vw - 2rem));
        max-height: 92dvh;
        box-sizing: border-box;
        padding: 3.5rem 1rem 1rem;
        border: 0;
        border-radius: 1.2rem;
        background: #fffdf9;
        color: #29221f;
      }
      .image-viewer::backdrop {
        background: #000d;
      }
      .image-viewer > img {
        display: block;
        width: 100%;
        height: min(70dvh, 800px);
        object-fit: contain;
      }
      .viewer-close {
        position: absolute;
        top: 0.5rem;
        inset-inline-end: 0.5rem;
        width: 2.5rem;
        height: 2.5rem;
        border: 0;
        border-radius: 50%;
        background: #f3ede6;
        font-size: 1.7rem;
        cursor: pointer;
      }
      .viewer-controls {
        display: flex;
        justify-content: center;
        gap: 1rem;
        margin-top: 1rem;
      }
      .viewer-controls button {
        padding: 0.6rem 1rem;
        border: 1px solid #e6d9cd;
        border-radius: 999px;
        background: #f7f3ed;
        cursor: pointer;
      }
      .details {
        min-width: 0;
        align-self: center;
      }
      .product-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }
      .eyebrow {
        color: #886f5f;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }
      .wishlist-button {
        display: grid;
        width: 2.75rem;
        height: 2.75rem;
        place-items: center;
        padding: 0;
        border: 1px solid #ded4cc;
        border-radius: 50%;
        background: #fffdf9;
        color: #3d312e;
        cursor: pointer;
      }
      .wishlist-button svg {
        width: 1.2rem;
        height: 1.2rem;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.65;
      }
      .wishlist-button:hover,
      .wishlist-button.is-favorite {
        border-color: #642c3a;
        background: #fff6f5;
        color: #642c3a;
      }
      .wishlist-button.is-favorite svg {
        fill: currentColor;
      }
      h1 {
        margin: 0.9rem 0 0.7rem;
        color: #29221f;
        font-family: Georgia, 'Times New Roman', serif;
        font-size: clamp(2.15rem, 4vw, 4.1rem);
        font-weight: 400;
        line-height: 1.04;
        letter-spacing: -0.035em;
      }
      .product-rating {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        color: #6e655f;
        font-size: 0.82rem;
      }
      .stars {
        display: inline-flex;
        gap: 0.1rem;
        color: #c58a1c;
        font-size: 1.15rem;
      }
      .stars .empty {
        color: #e4d8ca;
      }
      .price-row {
        display: flex;
        align-items: baseline;
        gap: 0.75rem;
        margin: 1.15rem 0 1.8rem;
      }
      .price-row strong {
        color: #29221f;
        font-size: 1.28rem;
        letter-spacing: 0.06em;
      }
      .price-row span {
        color: #968b84;
        font-size: 0.92rem;
        text-decoration: line-through;
      }
      .product-colors {
        padding: 1.15rem 0 1.35rem;
        border-top: 1px solid #ddd4cc;
      }
      .colors-label {
        margin: 0 0 0.85rem;
        color: #4a403d;
        font-size: 0.94rem;
      }
      .colors-label span {
        color: #867871;
      }
      .purchase-area {
        display: grid;
        grid-template-columns: minmax(130px, 0.45fr) 1fr;
        align-items: end;
        gap: 1.1rem;
      }
      .quantity-block {
        display: grid;
        gap: 0.65rem;
        color: #4a403d;
        font-size: 0.88rem;
      }
      .qty-selector {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        align-items: center;
        min-height: 3.35rem;
        border: 1px solid #83766f;
        border-radius: 0.7rem;
        background: #fffdf9;
        overflow: hidden;
      }
      .qty-selector button {
        height: 100%;
        padding: 0;
        border: 0;
        background: transparent;
        color: #3d3431;
        font-size: 1.35rem;
        cursor: pointer;
      }
      .qty-selector button:not(:disabled):hover {
        background: #f5eee8;
      }
      .qty-selector button:disabled {
        color: #c9bdb5;
        cursor: not-allowed;
      }
      .qty-selector span {
        text-align: center;
        font-size: 1rem;
      }
      .action-buttons {
        display: grid;
        gap: 0.6rem;
      }
      .action-buttons button {
        width: 100%;
        min-height: 3.35rem;
        border-radius: 0.7rem;
        font-size: 0.96rem;
        cursor: pointer;
        transition: transform 0.16s;
      }
      .add-button {
        border: 1px solid #352d2a;
        background: #fffdf9;
        color: #332c29;
      }
      .buy-button {
        border: 1px solid #302924;
        background: #302924;
        color: #fffdf9;
      }
      .action-buttons button:not(:disabled):hover {
        transform: translateY(-1px);
      }
      .add-button:not(:disabled):hover {
        background: #f5eee8;
      }
      .buy-button:not(:disabled):hover {
        background: #4b3b33;
      }
      .action-buttons button:disabled {
        cursor: not-allowed;
        opacity: 0.48;
      }
      .purchase-status {
        margin: 0.75rem 0 0;
        color: #9b554e;
        font-size: 0.82rem;
        line-height: 1.65;
      }
      .description {
        margin: 1.9rem 0 1.35rem;
        color: #706660;
        font-size: 1rem;
        line-height: 1.9;
      }
      .share-button {
        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
        padding: 0;
        border: 0;
        background: transparent;
        color: #4d4440;
        cursor: pointer;
      }
      .share-status {
        margin: 0.5rem 0 0;
        color: #6c625c;
        font-size: 0.78rem;
      }
      .feature-list {
        display: grid;
        gap: 0.6rem;
        margin-top: 1.6rem;
        padding-top: 1.3rem;
        border-top: 1px solid #ddd4cc;
      }
      .feature-item {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        color: #5d534e;
        font-size: 0.86rem;
      }
      .feature-item svg {
        width: 1rem;
        height: 1rem;
        fill: none;
        stroke: #93734e;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 1.8;
      }
      .related-products {
        padding-top: 1.2rem;
      }
      .related-heading {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1.35rem;
      }
      .related-heading h2 {
        margin: 0.5rem 0 0;
        color: #29221f;
        font-family: Georgia, 'Times New Roman', serif;
        font-size: clamp(2rem, 3vw, 3rem);
        font-weight: 400;
        letter-spacing: -0.03em;
      }
      .view-catalog {
        padding: 0.5rem 0;
        border: 0;
        border-bottom: 1px solid currentColor;
        background: transparent;
        color: #443934;
        font-size: 0.82rem;
        cursor: pointer;
      }
      .related-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 1rem;
      }
      .related-card {
        overflow: hidden;
        padding: 0;
        border: 1px solid #e6dfd8;
        border-radius: 0.9rem;
        background: #fffdf9;
        color: #29221f;
        text-align: start;
        cursor: pointer;
        transition:
          transform 0.18s,
          box-shadow 0.18s;
      }
      .related-card:hover {
        box-shadow: 0 12px 24px #261b1612;
        transform: translateY(-3px);
      }
      .related-card img {
        display: block;
        width: 100%;
        aspect-ratio: 0.86;
        object-fit: cover;
        background: #eee8e0;
      }
      .related-copy {
        display: grid;
        gap: 0.55rem;
        padding: 0.9rem;
      }
      .related-copy strong {
        overflow: hidden;
        font-family: Georgia, 'Times New Roman', serif;
        font-size: 1rem;
        font-weight: 400;
        line-height: 1.3;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .related-copy small {
        color: #4c413c;
        font-size: 0.78rem;
        letter-spacing: 0.05em;
      }
      @media (max-width: 900px) {
        .product-page {
          grid-template-columns: 1fr;
          gap: 2.25rem;
        }
        .details {
          max-width: 680px;
        }
        .main-image {
          aspect-ratio: 1/1.08;
        }
        .related-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 560px) {
        :host {
          padding-bottom: 3rem;
        }
        .container {
          width: min(100% - 1.5rem, 560px);
        }
        .product-page {
          padding-top: 1.25rem;
          gap: 1.9rem;
        }
        .media-stage {
          border-radius: 1rem;
        }
        .main-image {
          aspect-ratio: 0.88;
        }
        .zoom-icon {
          top: 0.75rem;
          inset-inline-start: 0.75rem;
          width: 2.5rem;
          height: 2.5rem;
        }
        .gallery-arrow {
          opacity: 1;
          width: 2.25rem;
          height: 2.25rem;
        }
        .thumbs {
          display: none;
        }
        .gallery-navigation {
          justify-content: center;
        }
        h1 {
          font-size: clamp(2.2rem, 11vw, 3.35rem);
        }
        .price-row {
          margin-bottom: 1.45rem;
        }
        .purchase-area {
          grid-template-columns: 1fr;
        }
        .quantity-block {
          max-width: 10.5rem;
        }
        .related-products {
          padding-top: 0.5rem;
        }
        .related-heading {
          align-items: center;
        }
        .related-heading h2 {
          font-size: 2rem;
        }
        .related-grid {
          gap: 0.7rem;
        }
        .related-copy {
          padding: 0.7rem;
        }
        .related-copy strong {
          font-size: 0.92rem;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .main-image,
        .gallery-arrow,
        .related-card,
        .action-buttons button {
          transition: none;
        }
      }
    `,
  ],
})
export class ProductDetailPageComponent {
  readonly network = inject(StorefrontLoadingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router, { optional: true });
  private readonly store = inject(StoreService);
  private readonly productsApi = inject(ProductService);
  private readonly destroyRef = inject(DestroyRef);
  @ViewChild('imageViewer') private imageViewer?: ElementRef<HTMLDialogElement>;

  readonly selectedImage = signal(0);
  readonly selectedColor = signal('');
  readonly quantity = signal(1);
  readonly shareMessage = signal('');
  readonly ratingStars = [1, 2, 3, 4, 5];
  private readonly slug = signal(this.route.snapshot.paramMap.get('slug') ?? '');
  readonly productRequest = computed(
    () => '/api/products/' + encodeURIComponent(this.slug().trim().toLowerCase()),
  );
  readonly product = computed(() => this.store.getProductBySlug(this.slug()));
  readonly lang = this.store.lang;
  readonly currency = this.store.currency;
  readonly chosenColor = computed(() =>
    this.product()?.colorOptions?.find((color) => color.hex === this.selectedColor()),
  );
  readonly colorReady = computed(
    () => !this.product()?.colorOptions?.length || !!this.chosenColor(),
  );
  readonly availableStock = computed(() => this.product()?.stock ?? 0);
  readonly canAddToCart = computed(
    () =>
      !!this.product() &&
      this.colorReady() &&
      this.quantity() > 0 &&
      this.availableStock() >= this.quantity(),
  );
  readonly relatedProducts = computed(() => {
    const item = this.product();
    const products = this.store.products?.() ?? [];
    if (!item) return [];
    const sameCategory = products.filter(
      (product) =>
        product.id !== item.id && product.stock > 0 && product.category === item.category,
    );
    const others = products.filter(
      (product) =>
        product.id !== item.id && product.stock > 0 && product.category !== item.category,
    );
    return [...sameCategory, ...others]
      .filter(
        (product, index, all) =>
          all.findIndex((candidate) => candidate.id === product.id) === index,
      )
      .slice(0, 4);
  });
  readonly purchaseLabel = computed(() => {
    const item = this.product();
    if (!item || item.stock <= 0) return this.lang() === 'ar' ? 'نفد المخزون' : 'Out of stock';
    return this.lang() === 'ar' ? 'أضف إلى السلة' : 'Add to cart';
  });
  readonly purchaseStatus = computed(() => {
    const ar = this.lang() === 'ar';
    if ((this.product()?.stock ?? 0) <= 0)
      return ar ? 'هذا المنتج غير متوفر حاليًا.' : 'This product is currently out of stock.';
    if (!this.colorReady())
      return ar
        ? 'اختاري اللون لإضافة المنتج إلى السلة.'
        : 'Choose a colour to add this item to your bag.';
    return ar
      ? 'الكمية المطلوبة أكبر من المخزون المتاح. قلّلي الكمية.'
      : 'The quantity exceeds available stock. Reduce the quantity.';
  });

  constructor() {
    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.closeImage();
      this.selectedImage.set(0);
      this.selectedColor.set('');
      this.slug.set(params['slug'] ?? '');
      this.productsApi.loadBySlug(this.slug());
      this.quantity.set(1);
    });
  }

  retryProduct(): void {
    this.productsApi.loadBySlug(this.slug());
  }
  roundedRating(rating: number): number {
    return Math.max(0, Math.min(5, Math.round(rating)));
  }
  isWishlisted(id: string): boolean {
    return this.store.isWishlisted?.(id) ?? false;
  }
  toggleWishlist(id: string): void {
    this.store.toggleWishlist?.(id);
  }
  selectImage(index: number): void {
    if (this.product()?.images[index]) this.selectedImage.set(index);
  }
  openImage(index: number): void {
    if (this.product()?.images[index]) {
      this.selectedImage.set(index);
      this.imageViewer?.nativeElement.showModal();
    }
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
    if (stock > 0) this.quantity.update((value) => Math.min(value + 1, stock));
  }
  decrementQty(): void {
    this.quantity.update((value) => Math.max(1, value - 1));
  }
  addToCart(): void {
    const item = this.product();
    if (!item || !this.canAddToCart()) return;
    const color = this.chosenColor();
    if (color) this.store.addToCart(item.id, this.quantity(), color.hex);
    else this.store.addToCart(item.id, this.quantity());
  }
  buyNow(): void {
    if (this.canAddToCart()) {
      this.addToCart();
      void this.router?.navigateByUrl('/checkout');
    }
  }
  goToProduct(slug: string): void {
    void this.router?.navigate(['/product', slug]);
  }
  goToCatalog(): void {
    void this.router?.navigateByUrl('/catalog');
  }
  shareProduct(product: Product): void {
    const url = globalThis.location?.href ?? '';
    const data = {
      title: product.name[this.lang()],
      text: product.shortDescription[this.lang()],
      url,
    };
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      void navigator.share(data).catch(() => undefined);
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(url).then(
        () => this.showShareMessage(),
        () => this.showShareMessage(),
      );
      return;
    }
    this.showShareMessage();
  }
  private showShareMessage(): void {
    this.shareMessage.set(this.lang() === 'ar' ? 'تم نسخ الرابط' : 'Link copied');
    setTimeout(() => this.shareMessage.set(''), 2500);
  }
}
