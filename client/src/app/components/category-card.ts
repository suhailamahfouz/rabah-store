import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Category, Lang } from '../models/store';
import { ProductService } from '../services/product.service';

@Component({
  selector: 'app-category-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <a
      class="category-card"
      [routerLink]="['/catalog', category.slug]"
      [attr.aria-label]="category.label[lang]"
    >
      <img class="category-image" [src]="image" alt="" loading="lazy" />
      <span class="category-shade" aria-hidden="true"></span>
      <span class="category-copy">
        <span class="category-name">{{ category.label[lang] }}</span>
        <span class="category-count">{{ productCount }} {{ productCountLabel }}</span>
      </span>
    </a>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }

      .category-card {
        position: relative;
        display: flex;
        overflow: hidden;
        aspect-ratio: 0.75;
        flex-direction: column;
        justify-content: end;
        padding: 1rem;
        border-radius: 0.65rem;
        background: #d7c9b9;
        color: #fff;
        text-decoration: none;
        isolation: isolate;
      }

      .category-card:focus-visible {
        outline: 2px solid #b89a63;
        outline-offset: 3px;
      }

      .category-image,
      .category-shade {
        position: absolute;
        z-index: -1;
        inset: 0;
        width: 100%;
        height: 100%;
      }

      .category-image {
        object-fit: cover;
        transition: transform 650ms cubic-bezier(0.2, 0.7, 0.2, 1);
      }

      .category-card:hover .category-image {
        transform: scale(1.055);
      }

      .category-shade {
        background: linear-gradient(
          0deg,
          rgba(14, 14, 14, 0.78) 0%,
          rgba(14, 14, 14, 0.3) 34%,
          rgba(14, 14, 14, 0) 72%
        );
      }

      .category-copy {
        display: grid;
        gap: 0.45rem;
      }

      .category-name {
        font-family: Georgia, 'Times New Roman', serif;
        font-size: clamp(0.95rem, 1.2vw, 1.15rem);
        font-weight: 600;
        line-height: 1.25;
      }

      .category-count {
        color: rgba(255, 255, 255, 0.84);
        font-size: 0.64rem;
        font-weight: 600;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      @media (prefers-reduced-motion: reduce) {
        .category-image {
          transition: none;
        }
      }
    `,
  ],
})
export class CategoryCardComponent {
  private readonly products = inject(ProductService).products;

  @Input({ required: true }) category!: Category;
  @Input() lang: Lang = 'ar';

  get categoryProducts() {
    return this.products().filter(
      (product) =>
        product.category === this.category.id ||
        product.additionalCategories?.includes(this.category.id),
    );
  }

  get image(): string {
    return this.category.image || this.categoryProducts[0]?.images[0] || '';
  }

  get productCount(): number {
    return this.categoryProducts.length;
  }

  get productCountLabel(): string {
    if (this.lang !== 'ar') {
      return this.productCount === 1 ? 'product' : 'products';
    }

    return this.productCount === 1 ? 'منتج' : this.productCount === 2 ? 'منتجان' : 'منتجات';
  }
}
