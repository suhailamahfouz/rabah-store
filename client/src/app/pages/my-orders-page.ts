import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CustomerOrderSummary, OrderService } from '../services/order.service';
import { StoreService } from '../services/store.service';

@Component({
  selector: 'app-my-orders-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="orders-page" [attr.dir]="store.lang() === 'ar' ? 'rtl' : 'ltr'">
      <section class="orders-shell">
        <p class="eyebrow">RABAH</p>
        <h1>{{ store.lang() === 'ar' ? 'طلباتي' : 'My orders' }}</h1>
        <p class="intro">{{ store.lang() === 'ar' ? 'تابع تفاصيل طلباتك وحالتها في مكان واحد.' : 'Track your orders and their details in one place.' }}</p>

        <div class="state loading-state" *ngIf="loading()" role="status" aria-live="polite">
          <span class="spinner" aria-hidden="true"></span>
          {{ store.lang() === 'ar' ? 'جارٍ تحميل طلباتك...' : 'Loading your orders...' }}
        </div>

        <div class="state error-state" *ngIf="!loading() && error()" role="alert">
          <strong>{{ store.lang() === 'ar' ? 'تعذر تحميل الطلبات' : 'Unable to load orders' }}</strong>
          <p>{{ error() }}</p>
          <button type="button" class="secondary-button" (click)="loadOrders()">{{ store.lang() === 'ar' ? 'إعادة المحاولة' : 'Try again' }}</button>
        </div>

        <div class="state empty-state" *ngIf="!loading() && !error() && !orders().length">
          <div class="empty-icon" aria-hidden="true">⌁</div>
          <h2>{{ store.lang() === 'ar' ? 'لا توجد طلبات بعد' : 'No orders yet' }}</h2>
          <p>{{ store.lang() === 'ar' ? 'ستظهر طلباتك هنا بعد إتمام أول عملية شراء.' : 'Your orders will appear here after your first purchase.' }}</p>
          <a routerLink="/catalog" class="primary-button">{{ store.lang() === 'ar' ? 'تصفح المتجر' : 'Browse store' }}</a>
        </div>

        <div class="orders-list" *ngIf="!loading() && !error() && orders().length">
          <article class="order-card" *ngFor="let order of orders(); trackBy: trackOrder">
            <header class="order-header">
              <div>
                <span class="order-label">{{ store.lang() === 'ar' ? 'رقم الطلب' : 'Order number' }}</span>
                <strong dir="ltr">{{ order.orderNumber }}</strong>
                <time [attr.datetime]="order.createdAt">{{ formatDate(order.createdAt) }}</time>
              </div>
              <span class="status" [class.cancelled]="order.status === 'cancelled'">{{ statusLabel(order.status) }}</span>
            </header>

            <div class="items-list">
              <div class="order-item" *ngFor="let item of order.items">
                <div class="item-image-wrap">
                  <img *ngIf="item.image; else noImage" [src]="item.image" [alt]="item.name[store.lang()]" loading="lazy" />
                  <ng-template #noImage><span class="no-image" aria-hidden="true">R</span></ng-template>
                </div>
                <div class="item-details">
                  <strong>{{ item.name[store.lang()] || item.name.en || item.name.ar }}</strong>
                  <span *ngIf="item.note" class="item-note">{{ store.lang() === 'ar' ? 'ملحوظة:' : 'Note:' }} {{ item.note }}</span>
                  <span class="quantity">{{ store.lang() === 'ar' ? 'الكمية:' : 'Quantity:' }} {{ item.quantity }}</span>
                </div>
                <strong class="item-total">{{ item.lineTotal | number:'1.0-2' }} {{ order.currency }}</strong>
              </div>
            </div>

            <footer class="order-footer">
              <div><span>{{ store.lang() === 'ar' ? 'الشحن' : 'Shipping' }}</span><strong>{{ order.shippingFee | number:'1.0-2' }} {{ order.currency }}</strong></div>
              <div class="grand-total"><span>{{ store.lang() === 'ar' ? 'الإجمالي' : 'Order total' }}</span><strong>{{ order.total | number:'1.0-2' }} {{ order.currency }}</strong></div>
            </footer>
          </article>
        </div>

        <a class="back-link" routerLink="/catalog">{{ store.lang() === 'ar' ? 'العودة للمتجر' : 'Back to store' }}</a>
      </section>
    </main>
  `,
  styles: [`
    :host { display:block; min-height:70vh; background:#faf7f1; }
    .orders-page { width:min(980px,calc(100% - 2rem)); margin:auto; padding:clamp(2rem,5vw,4rem) 0; }
    .orders-shell { padding:clamp(1.25rem,4vw,3rem); border:1px solid rgba(84,33,44,.1); border-radius:1.5rem; background:#fffdf9; box-shadow:0 18px 45px rgba(84,33,44,.06); }
    .eyebrow { margin:0 0 .6rem; color:#a98756; font-size:.75rem; font-weight:700; letter-spacing:.14em; }
    h1 { margin:0; color:#45111f; font-family:Georgia,'Times New Roman',serif; font-size:clamp(2rem,4vw,3.3rem); }
    .intro { margin:.7rem 0 2rem; color:#877c72; }
    .state { padding:2.5rem 1rem; border:1px dashed #e4d8ca; border-radius:1rem; color:#877c72; text-align:center; }
    .state h2 { margin:.7rem 0 .35rem; color:#45111f; }
    .state p { margin:.3rem 0 1.2rem; }
    .loading-state { display:flex; align-items:center; justify-content:center; gap:.7rem; }
    .spinner { width:1.1rem; height:1.1rem; border:2px solid #eadfd3; border-top-color:#641b2e; border-radius:50%; animation:spin .8s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .error-state { border-color:#efd0ca; background:#fff8f6; color:#a32d25; }
    .error-state strong { color:#8d241f; }
    .empty-icon { color:#b28a55; font-size:2.2rem; }
    .orders-list { display:grid; gap:1rem; }
    .order-card { overflow:hidden; border:1px solid #eadfd3; border-radius:1rem; background:#fff; }
    .order-header { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; padding:1.2rem 1.25rem; border-bottom:1px solid #f0e8df; }
    .order-header > div { display:grid; gap:.25rem; }
    .order-label { color:#a98756; font-size:.7rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; }
    .order-header strong { color:#45111f; font-size:1rem; }
    .order-header time { color:#877c72; font-size:.78rem; }
    .status { padding:.38rem .7rem; border-radius:999px; background:#f2eadf; color:#795b33; font-size:.76rem; font-weight:700; white-space:nowrap; }
    .status.cancelled { background:#f8e5e2; color:#a32d25; }
    .items-list { padding:.3rem 1.25rem; }
    .order-item { display:grid; grid-template-columns:4.5rem 1fr auto; align-items:center; gap:1rem; padding:.9rem 0; border-bottom:1px solid #f3ede7; }
    .order-item:last-child { border-bottom:0; }
    .item-image-wrap { width:4.5rem; height:4.5rem; overflow:hidden; border-radius:.7rem; background:#f4ede5; }
    .item-image-wrap img { width:100%; height:100%; object-fit:cover; }
    .no-image { display:grid; width:100%; height:100%; place-items:center; color:#a98756; font-family:Georgia,serif; font-size:1.8rem; }
    .item-details { display:grid; gap:.28rem; min-width:0; }
    .item-details strong { overflow:hidden; color:#302925; text-overflow:ellipsis; white-space:nowrap; }
    .item-details span { color:#877c72; font-size:.78rem; }
    .color { color:#795b33 !important; }
    .item-total { color:#641b2e; font-size:.85rem; white-space:nowrap; }
    .order-footer { display:flex; justify-content:flex-end; gap:1.5rem; padding:1rem 1.25rem; background:#fcf8f3; }
    .order-footer div { display:grid; gap:.25rem; text-align:end; }
    .order-footer span { color:#877c72; font-size:.76rem; }
    .order-footer strong { color:#45111f; }
    .grand-total strong { color:#641b2e; font-size:1.1rem; }
    .primary-button,.secondary-button { display:inline-flex; align-items:center; justify-content:center; border:0; border-radius:999px; padding:.75rem 1.15rem; font:inherit; font-weight:700; text-decoration:none; cursor:pointer; }
    .primary-button { background:#641b2e; color:#fff; }
    .secondary-button { background:#f1e5d9; color:#641b2e; }
    .back-link { display:inline-block; margin-top:1.5rem; color:#641b2e; font-weight:700; text-decoration:none; }
    @media(max-width:560px) { .order-header { align-items:stretch; flex-direction:column; } .status { align-self:flex-start; } .order-item { grid-template-columns:3.5rem 1fr; gap:.75rem; } .item-image-wrap { width:3.5rem; height:3.5rem; } .item-total { grid-column:2; } .order-footer { justify-content:space-between; gap:.8rem; } }
  `],
})
export class MyOrdersPageComponent {
  readonly store = inject(StoreService);
  private readonly ordersApi = inject(OrderService);
  readonly orders = signal<CustomerOrderSummary[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  constructor() { this.loadOrders(); }

  loadOrders(): void {
    this.loading.set(true);
    this.error.set('');
    this.ordersApi.myOrders().subscribe({
      next: ({ data }) => { this.orders.set(data); this.loading.set(false); },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.error?.message ?? (this.store.lang() === 'ar' ? 'تعذر تحميل طلباتك.' : 'Unable to load your orders.'));
        this.loading.set(false);
      },
    });
  }

  trackOrder(_index: number, order: CustomerOrderSummary): string { return order.id; }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat(this.store.lang() === 'ar' ? 'ar-EG' : 'en', { dateStyle: 'medium' }).format(new Date(value));
  }

  statusLabel(status: string): string {
    if (this.store.lang() !== 'ar') return status;
    return ({ new: 'جديد', confirmed: 'تم التأكيد', preparing: 'قيد التجهيز', shipped: 'تم الشحن', completed: 'مكتمل', cancelled: 'ملغي' } as Record<string, string>)[status] ?? status;
  }
}
