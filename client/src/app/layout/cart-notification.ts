import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { StoreService } from '../services/store.service';

@Component({
  selector: 'app-cart-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="cart-notification"
      *ngIf="store.cartNotification() as notification"
      [attr.dir]="store.lang() === 'ar' ? 'rtl' : 'ltr'"
      role="status"
      aria-live="polite"
    >
      <span class="notification-check" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"></path></svg>
      </span>
      <span class="notification-copy">
        <strong>{{ store.lang() === 'ar' ? 'اتضافت للسلة' : 'Added to your cart' }}</strong>
        <span>{{ notification.productName }}</span>
      </span>
    </div>
  `,
  styles: [`
    .cart-notification {
      position: fixed;
      z-index: 100;
      top: max(1rem, env(safe-area-inset-top));
      left: 50%;
      display: flex;
      max-width: min(24rem, calc(100vw - 2rem));
      align-items: center;
      gap: .75rem;
      padding: .9rem 1.1rem;
      border: 1px solid #18864b;
      border-radius: 1rem;
      background: #e9f8ef;
      color: #14532d;
      box-shadow: 0 12px 36px rgba(20, 83, 45, .2);
      transform: translateX(-50%);
      animation: cart-notification-in 180ms ease-out;
    }
    .notification-check {
      display: grid;
      width: 2rem;
      height: 2rem;
      flex: 0 0 auto;
      place-items: center;
      border-radius: 50%;
      background: #18864b;
      color: #fff;
    }
    .notification-check svg {
      width: 1.15rem;
      height: 1.15rem;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2;
    }
    .notification-copy { display: grid; gap: .2rem; min-width: 0; }
    .notification-copy strong { font-size: .9rem; }
    .notification-copy > span {
      overflow: hidden;
      color: #38734e;
      font-size: .78rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    @keyframes cart-notification-in {
      from { opacity: 0; transform: translate(-50%, -.5rem); }
      to { opacity: 1; transform: translate(-50%, 0); }
    }
    @media (prefers-reduced-motion: reduce) {
      .cart-notification { animation: none; }
    }
  `],
})
export class CartNotificationComponent {
  readonly store = inject(StoreService);
}
