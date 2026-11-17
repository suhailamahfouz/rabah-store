import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Lang, Product } from '../models/store';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <article class="product-card" [class.out-of-stock]="outOfStock" [attr.dir]="lang === 'ar' ? 'rtl' : 'ltr'">
      <div class="product-visual">
        <a
          class="image-link"
          [routerLink]="['/product', product.slug]"
          [attr.aria-label]="product.name[lang]"
        >
          <img [src]="product.images[0]" [alt]="product.name[lang]" loading="lazy" />
          <span class="stock-badge" *ngIf="outOfStock">{{ lang === 'ar' ? 'نفد المخزون' : 'Out of stock' }}</span>
          <span class="sale-badge" *ngIf="discountPercent && !outOfStock"
            >{{ discountPercent }}% {{ lang === 'ar' ? 'خصم' : 'OFF' }}</span
          >
        </a>
        <button
          type="button"
          class="favorite-button"
          [class.is-favorite]="wishlisted"
          [attr.aria-label]="
            wishlisted
              ? lang === 'ar'
                ? 'إزالة من المفضلة'
                : 'Remove from wishlist'
              : lang === 'ar'
                ? 'أضف إلى المفضلة'
                : 'Add to wishlist'
          "
          [attr.aria-pressed]="wishlisted"
          (click)="wishlistToggle.emit(product.id)"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M20.8 8.7c0 5.5-8.8 11-8.8 11s-8.8-5.5-8.8-11A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.5Z"
            ></path>
          </svg>
        </button>
        <div class="quick-actions">
          <button type="button" class="add-button" [disabled]="outOfStock" (click)="requestAddToCart()">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 8h14l1 12H4L5 8Z"></path>
              <path d="M9 9V6a3 3 0 0 1 6 0v3"></path>
            </svg>
            {{ outOfStock ? (lang === 'ar' ? 'نفد المخزون' : 'Out of stock') : (lang === 'ar' ? 'أضف إلى السلة' : 'Add to bag') }}
          </button>
        </div>
      </div>
      <div class="product-copy">
        <div class="product-meta">
          <span class="product-category">{{ categoryLabel }}</span>
        </div>
        <a class="product-name" [routerLink]="['/product', product.slug]">{{
          product.name[lang]
        }}</a>
        <p class="product-description">{{ product.shortDescription[lang] }}</p>
        <div class="price-row">
          <span class="current-price">{{ product.price }} {{ currency }}</span>
          <span class="original-price" *ngIf="product.originalPrice"
            >{{ product.originalPrice }} {{ currency }}</span
          >
        </div>
      </div>
    </article>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }

      .product-card {
        height: 100%;
        background: #fffdf9;
      }

      .stock-badge { position: absolute; inset-block-start: .85rem; inset-inline-start: .85rem; padding: .5rem .7rem; border-radius: .35rem; background: #54212c; color: #fffdf9; font-size: .75rem; font-weight: 700; }
      .out-of-stock .image-link img { opacity: .75; }
      .add-button:disabled { background: #e9e2db; color: #74665c; cursor: not-allowed; }

      .product-visual {
        position: relative;
        overflow: hidden;
        aspect-ratio: 0.82;
        background: #eee7de;
      }

      .image-link,
      .image-link img {
        display: block;
        width: 100%;
        height: 100%;
      }

      .image-link img {
        object-fit: cover;
        transition: transform 650ms cubic-bezier(0.2, 0.7, 0.2, 1);
      }

      .product-card:hover .image-link img {
        transform: scale(1.045);
      }

      .sale-badge {
        position: absolute;
        top: 0.8rem;
        left: 0.8rem;
        padding: 0.45rem 0.6rem;
        background: #641b2e;
        color: #faf7f1;
        font-size: 0.65rem;
        letter-spacing: 0.06em;
      }

      .favorite-button {
        position: absolute;
        top: 0.7rem;
        right: 0.7rem;
        display: grid;
        width: 2.4rem;
        height: 2.4rem;
        place-items: center;
        border: 0;
        border-radius: 50%;
        background: rgba(250, 247, 241, 0.92);
        color: #641b2e;
        cursor: pointer;
      }

      .favorite-button svg {
        width: 1.2rem;
        height: 1.2rem;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.6;
      }

      .favorite-button.is-favorite svg {
        fill: #641b2e;
      }

      .quick-actions {
        position: absolute;
        right: 0.75rem;
        bottom: 0.75rem;
        left: 0.75rem;
        opacity: 0;
        transform: translateY(0.5rem);
        transition:
          opacity 180ms ease,
          transform 180ms ease;
      }

      .product-visual:hover .quick-actions,
      .product-visual:focus-within .quick-actions {
        opacity: 1;
        transform: translateY(0);
      }

      .add-button {
        display: flex;
        width: 100%;
        min-height: 2.8rem;
        align-items: center;
        justify-content: center;
        gap: 0.55rem;
        border: 0;
        background: rgba(100, 27, 46, 0.95);
        color: #faf7f1;
        cursor: pointer;
        font: inherit;
        font-size: 0.74rem;
        letter-spacing: 0.03em;
      }

      .add-button:hover {
        background: #4f1726;
      }

      .add-button svg {
        width: 1rem;
        height: 1rem;
        fill: none;
        stroke: currentColor;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 1.6;
      }

      .product-copy {
        display: grid;
        gap: 0.55rem;
        padding: 1rem 0.1rem;
      }

      .product-meta,
      .price-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
      }

      .product-category {
        color: #82776e;
        font-size: 0.65rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .product-name {
        overflow: hidden;
        color: #29221f;
        font-family: Georgia, 'Times New Roman', serif;
        font-size: 1.1rem;
        text-decoration: none;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .product-name:hover {
        color: #641b2e;
      }

      .product-description {
        min-height: 2.6em;
        margin: 0;
        color: #82776e;
        font-size: 0.76rem;
        line-height: 1.6;
      }

      .price-row {
        justify-content: flex-start;
      }

      .current-price {
        color: #641b2e;
        font-size: 0.88rem;
        font-weight: 600;
      }

      .original-price {
        color: #9a918a;
        font-size: 0.72rem;
        text-decoration: line-through;
      }

      @media (max-width: 760px) {
        .quick-actions {
          opacity: 1;
          transform: none;
        }

        .product-copy {
          padding-top: 0.75rem;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .image-link img,
        .quick-actions,
        .product-name {
          transition: none;
        }
      }
    `,
  ],
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;
  @Input() lang: Lang = 'ar';
  @Input() currency = 'EGP';
  @Input() categoryLabel = '';
  @Input() wishlisted = false;
  @Output() wishlistToggle = new EventEmitter<string>();
  @Output() addToCart = new EventEmitter<string>();

  get outOfStock(): boolean { return !(this.product.stock > 0); }
  requestAddToCart(): void {
    if (!this.outOfStock) this.addToCart.emit(this.product.id);
  }

  get discountPercent(): number {
    if (!this.product.originalPrice || this.product.originalPrice <= this.product.price) {
      return 0;
    }

    return Math.round((1 - this.product.price / this.product.originalPrice) * 100);
  }
}
