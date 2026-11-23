import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Category, Lang } from '../models/store';
import { ProductService } from '../services/product.service';

@Component({
  selector: 'app-category-card',
  standalone: true,
  imports: [RouterLink],
  template: `
    <a
      class="category-card"
      [routerLink]="['/catalog', category.slug]"
      [attr.aria-label]="category.label[lang]"
    >
      <span class="category-image-wrap">
        <img class="category-image" [src]="image" [alt]="category.label[lang]" loading="lazy" />
      </span>
      <span class="category-copy">
        <span class="category-name">{{ category.label[lang] }}</span>
        <svg class="category-arrow" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h13M13 6l6 6-6 6"></path>
        </svg>
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
        display: block;
        overflow: hidden;
        border: 1px solid #e8e2dc;
        border-radius: 0.7rem;
        background: #fffdf9;
        color: #29221f;
        text-decoration: none;
        transition:
          box-shadow 180ms ease,
          transform 180ms ease;
      }
      .category-card:hover {
        box-shadow: 0 16px 30px rgba(48, 35, 28, 0.1);
        transform: translateY(-3px);
      }
      .category-card:focus-visible {
        outline: 2px solid #b89a63;
        outline-offset: 3px;
      }
      .category-image-wrap {
        display: block;
        overflow: hidden;
        aspect-ratio: 1.06;
        background: #eee7de;
      }
      .category-image {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 650ms cubic-bezier(0.2, 0.7, 0.2, 1);
      }
      .category-card:hover .category-image {
        transform: scale(1.055);
      }
      .category-copy {
        display: flex;
        min-height: 6.6rem;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0 1.7rem;
      }
      .category-name {
        font-family: Georgia, 'Times New Roman', serif;
        font-size: clamp(1.2rem, 1.9vw, 1.7rem);
        font-weight: 400;
        line-height: 1.25;
      }
      .category-arrow {
        width: 1.5rem;
        height: 1.5rem;
        flex: 0 0 auto;
        fill: none;
        stroke: currentColor;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 1.45;
      }
      :host-context([dir='rtl']) .category-arrow {
        transform: scaleX(-1);
      }
      @media (max-width: 640px) {
        .category-copy {
          min-height: 6.2rem;
          padding-inline: 1.5rem;
        }
        .category-name {
          font-size: 1.65rem;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .category-card,
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
}
