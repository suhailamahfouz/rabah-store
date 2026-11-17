import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoreService } from '../services/store.service';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="container page-shell" *ngIf="cartItems().length; else emptyCart">
      <div class="page-header">
        <div>
          <p class="eyebrow">{{ lang() === 'ar' ? 'سلة المشتريات' : 'Shopping cart' }}</p>
          <h1>{{ lang() === 'ar' ? 'منتجاتك المختارة' : 'Your selected items' }}</h1>
        </div>
      </div>

      <div class="cart-layout">
        <div class="cart-items">
          <article class="cart-item" *ngFor="let item of cartItems(); trackBy: trackCartItem">
            <img [src]="item.product.images[0]" [alt]="item.product.name[lang()]" />
            <div class="item-copy">
              <h3>{{ item.product.name[lang()] }}</h3>
              <p>{{ item.product.shortDescription[lang()] }}</p>
              <label class="item-note-editor">
                <span>{{ lang() === 'ar' ? 'ملحوظة اختيارية لهذا المنتج' : 'Optional note for this item' }}</span>
                <textarea rows="2" maxlength="500" [value]="item.note || ''" (input)="updateNote(item.productId, $event, item.cartIndex)" [placeholder]="lang() === 'ar' ? 'اكتبي أي تفاصيل تخص المنتج…' : 'Add any details about this item…'"></textarea>
              </label>
              <div class="controls">
                <div class="qty-selector">
                  <button type="button" (click)="updateQuantity(item.product.id, item.quantity - 1, item.color, item.variantId)">−</button>
                  <span>{{ item.quantity }}</span>
                  <button type="button" (click)="updateQuantity(item.product.id, item.quantity + 1, item.color, item.variantId)">＋</button>
                </div>
                <button
                  type="button"
                  class="remove-btn"
                  [attr.aria-label]="lang() === 'ar' ? 'حذف المنتج' : 'Remove item'"
                  [title]="lang() === 'ar' ? 'حذف المنتج' : 'Remove item'"
                  (click)="remove(item.product.id, item.color, item.variantId)"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"></path>
                  </svg>
                </button>
              </div>
            </div>
            <div class="item-price">
              <strong>{{ item.product.price * item.quantity }} {{ currency() }}</strong>
            </div>
          </article>
        </div>

        <aside class="summary-card">
          <h2>{{ lang() === 'ar' ? 'ملخص الطلب' : 'Order summary' }}</h2>
          <div class="summary-row">
            <span>{{ lang() === 'ar' ? 'المجموع الفرعي' : 'Subtotal' }}</span>
            <strong>{{ subtotal() }} {{ currency() }}</strong>
          </div>
          <div class="summary-row">
            <span>{{ lang() === 'ar' ? 'الشحن' : 'Shipping' }}</span>
            <strong>{{ lang() === 'ar' ? 'يُحدد بعد كتابة العنوان' : 'Calculated after address entry' }}</strong>
          </div>
          <div class="summary-row total">
            <span>{{ lang() === 'ar' ? 'الإجمالي قبل الشحن' : 'Total before shipping' }}</span>
            <strong>{{ subtotal() }} {{ currency() }}</strong>
          </div>
          <a routerLink="/checkout" class="checkout-btn">{{ lang() === 'ar' ? 'إتمام الطلب' : 'Proceed to checkout' }}</a>
        </aside>
      </div>
    </section>

    <ng-template #emptyCart>
      <section class="container empty-state">
        <h2>{{ lang() === 'ar' ? 'سلة المشتريات فارغة' : 'Your cart is empty' }}</h2>
        <p>{{ lang() === 'ar' ? 'ابدأ بتصفح المنتجات المفضلة لديك.' : 'Start browsing our latest essentials.' }}</p>
        <a routerLink="/catalog" class="checkout-btn">{{ lang() === 'ar' ? 'تصفح المتجر' : 'Browse catalog' }}</a>
      </section>
    </ng-template>
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

      .page-shell {
        padding: 2rem 0 4rem;
      }

      .page-header {
        margin-bottom: 1.5rem;
      }

      .eyebrow {
        margin: 0;
        color: #8d573c;
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      h1 {
        margin: 0.5rem 0 0;
        font-size: clamp(2rem, 3vw, 2.8rem);
      }

      .cart-layout {
        display: grid;
        grid-template-columns: 1.3fr 0.7fr;
        gap: 2rem;
      }

      .cart-items {
        display: grid;
        gap: 1rem;
      }

      .cart-item {
        display: grid;
        grid-template-columns: 140px 1fr auto;
        gap: 1rem;
        background: white;
        border: 1px solid rgba(17, 24, 39, 0.06);
        border-radius: 1.5rem;
        padding: 1rem;
      }

      .cart-item img {
        width: 100%;
        height: 140px;
        object-fit: cover;
        border-radius: 1rem;
      }

      .item-copy h3 {
        margin: 0 0 0.4rem;
      }

      .item-note-editor { display: grid; gap: .4rem; margin-top: .8rem; font-size: .85rem; color: #5d5752; }
      .item-note-editor textarea { width: 100%; box-sizing: border-box; resize: vertical; padding: .7rem; border: 1px solid #e6d9cd; border-radius: .7rem; background: #fffdf9; color: #29221f; }

      .item-copy p {
        margin: 0;
        color: #5d5752;
        line-height: 1.5;
      }

      .meta-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.8rem;
        margin-top: 0.8rem;
        color: #5d5752;
        font-size: 0.82rem;
      }

      .controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin-top: 1rem;
        flex-wrap: wrap;
      }

      .qty-selector {
        display: inline-flex;
        align-items: center;
        gap: 0.75rem;
        background: #f7efe9;
        border-radius: 999px;
        padding: 0.45rem 0.7rem;
      }

      .qty-selector button {
        border: none;
        background: transparent;
        font-size: 1.3rem;
        cursor: pointer;
      }

      .remove-btn {
        display: grid;
        width: 2.5rem;
        height: 2.5rem;
        place-items: center;
        border: none;
        background: transparent;
        color: #8d573c;
        cursor: pointer;
        border-radius: 50%;
        transition: color 160ms ease, background 160ms ease;
      }

      .remove-btn svg {
        width: 1.25rem;
        height: 1.25rem;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.7;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .remove-btn:hover,
      .remove-btn:focus-visible {
        color: #641b2e;
        background: #f7efe9;
      }

      .remove-btn:focus-visible {
        outline: 2px solid #8d573c;
        outline-offset: 2px;
      }

      .item-price {
        display: flex;
        align-items: center;
        font-size: 1.1rem;
      }

      .summary-card {
        background: #1f1b1a;
        color: white;
        border-radius: 1.5rem;
        padding: 1.5rem;
        height: fit-content;
      }

      .summary-card h2 {
        margin-top: 0;
        font-size: 1.5rem;
      }

      .summary-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        padding: 0.75rem 0;
        border-bottom: 1px solid rgba(255,255,255,0.12);
      }

      .summary-row.total {
        font-size: 1.2rem;
        font-weight: 700;
        border-bottom: none;
      }

      .checkout-btn {
        display: block;
        text-align: center;
        background: linear-gradient(135deg, #8d573c, #d3a06f);
        color: white;
        text-decoration: none;
        border-radius: 999px;
        padding: 0.95rem 1rem;
        margin-top: 1.2rem;
        font-weight: 700;
      }

      .empty-state {
        text-align: center;
        padding: 4rem 0;
      }

      @media (max-width: 860px) {
        .cart-layout {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 620px) {
        .cart-item {
          grid-template-columns: 1fr;
          gap: 1.15rem;
          padding: 1.15rem;
        }

        .cart-item img {
          height: clamp(190px, 52vw, 250px);
        }

        .item-copy h3 {
          font-size: 1.15rem;
        }

        .item-copy p {
          font-size: 0.95rem;
        }

        .item-price {
          font-size: 1.2rem;
        }
      }
    `,
  ],
})
export class CartPageComponent {
  private readonly store = inject(StoreService);

  readonly lang = this.store.lang;
  readonly currency = this.store.currency;
  readonly cartItems = computed(() =>
    this.store
      .cart()
      .map((item, cartIndex) => {
        const product = this.store.getProductById(item.productId);
        return product ? { ...item, product, cartIndex } : null;
      })
      .filter((item): item is NonNullable<typeof item> => !!item),
  );

  readonly subtotal = computed(() => this.store.subtotal);
  trackCartItem(_index: number, item: { cartIndex: number }): number { return item.cartIndex; }

  updateNote(productId: string, event: Event, index: number): void {
    this.store.updateItemNote(productId, (event.target as HTMLTextAreaElement).value, index);
  }

  updateQuantity(productId: string, quantity: number, color?: string, variantId?: string): void {
    this.store.updateQuantity(productId, quantity, color, variantId);
  }

  remove(productId: string, color?: string, variantId?: string): void {
    this.store.removeFromCart(productId, color, variantId);
  }
}
