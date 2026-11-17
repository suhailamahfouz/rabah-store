import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { OrderTrackingEvent, OrderService, TrackedOrder } from '../services/order.service';
import { StoreService } from '../services/store.service';

@Component({
  selector: 'app-track-order-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <main class="track-page" [attr.dir]="lang() === 'ar' ? 'rtl' : 'ltr'">
      <section class="track-shell">
        <header class="page-intro">
          <p class="eyebrow">RABAH · ORDER TRACKING</p>
          <h1>{{ lang() === 'ar' ? 'تتبّع طلبك' : 'Track your order' }}</h1>
          <p>{{ lang() === 'ar' ? 'أدخل بيانات التحقق لعرض حالة طلبك فقط.' : 'Enter your verification details to view only your order status.' }}</p>
        </header>

        <form class="tracking-form" [formGroup]="form" (ngSubmit)="track()" novalidate>
          <label>
            <span>{{ lang() === 'ar' ? 'رقم الطلب' : 'Order number' }}</span>
            <input formControlName="orderNumber" dir="ltr" autocomplete="off" autocapitalize="characters" placeholder="RBAH-2026-00001" />
          </label>

          <fieldset>
            <legend>{{ lang() === 'ar' ? 'طريقة التحقق' : 'Verification method' }}</legend>
            <div class="verify-switch" role="radiogroup" [attr.aria-label]="lang() === 'ar' ? 'طريقة التحقق' : 'Verification method'">
              <button type="button" [class.active]="verificationMode() === 'phone'" [attr.aria-checked]="verificationMode() === 'phone'" role="radio" (click)="setVerificationMode('phone')">
                {{ lang() === 'ar' ? 'رقم الهاتف' : 'Phone number' }}
              </button>
              <button type="button" [class.active]="verificationMode() === 'accessCode'" [attr.aria-checked]="verificationMode() === 'accessCode'" role="radio" (click)="setVerificationMode('accessCode')">
                {{ lang() === 'ar' ? 'رمز الوصول' : 'Access code' }}
              </button>
            </div>

            <label *ngIf="verificationMode() === 'phone'">
              <span>{{ lang() === 'ar' ? 'رقم الهاتف المستخدم عند الطلب' : 'Phone number used at checkout' }}</span>
              <input formControlName="phone" dir="ltr" type="tel" inputmode="tel" autocomplete="tel" placeholder="01XXXXXXXXX" />
            </label>
            <label *ngIf="verificationMode() === 'accessCode'">
              <span>{{ lang() === 'ar' ? 'رمز الوصول' : 'Access code' }}</span>
              <input formControlName="accessCode" dir="ltr" type="password" autocomplete="one-time-code" spellcheck="false" placeholder="64-character access code" />
            </label>
          </fieldset>

          <p class="privacy-note">
            <span aria-hidden="true">◌</span>
            {{ lang() === 'ar' ? 'لن نعرض الاسم أو العنوان أو أي بيانات دفع حساسة.' : 'Your name, address, and sensitive payment data are never shown here.' }}
          </p>
          <p class="form-error" *ngIf="errorMessage()" role="alert">{{ errorMessage() }}</p>
          <button class="submit-button" type="submit" [disabled]="loading()">
            {{ loading() ? (lang() === 'ar' ? 'جارٍ التحقق…' : 'Verifying…') : (lang() === 'ar' ? 'عرض حالة الطلب' : 'View order status') }}
          </button>
        </form>

        <section class="result-card" *ngIf="trackedOrder() as order" aria-live="polite">
          <div class="result-heading">
            <div>
              <p>{{ lang() === 'ar' ? 'تم التحقق من الطلب' : 'Order verified' }}</p>
              <strong dir="ltr">{{ order.orderNumber }}</strong>
            </div>
            <span class="status-pill" [class]="'status-pill ' + order.status">{{ orderStatusLabel(order.status) }}</span>
          </div>

          <div class="facts-grid">
            <div class="fact">
              <span>{{ lang() === 'ar' ? 'تاريخ الطلب' : 'Order date' }}</span>
              <strong>{{ formatDate(order.createdAt) }}</strong>
            </div>
            <div class="fact">
              <span>{{ lang() === 'ar' ? 'حالة الدفع' : 'Payment status' }}</span>
              <strong>{{ paymentStatusLabel(order.paymentStatus) }}</strong>
            </div>
            <div class="fact">
              <span>{{ lang() === 'ar' ? 'حالة الشحن' : 'Shipping status' }}</span>
              <strong>{{ shippingStatusLabel(order.shippingStatus) }}</strong>
            </div>
            <div class="fact delivery" *ngIf="order.estimatedDelivery; else unavailableDelivery">
              <span>{{ lang() === 'ar' ? 'موعد التوصيل المتوقع' : 'Estimated delivery' }}</span>
              <strong>{{ deliveryRange(order) }}</strong>
            </div>
            <ng-template #unavailableDelivery>
              <div class="fact delivery">
                <span>{{ lang() === 'ar' ? 'موعد التوصيل المتوقع' : 'Estimated delivery' }}</span>
                <strong>{{ lang() === 'ar' ? 'يُحدَّث قريبًا' : 'To be updated soon' }}</strong>
              </div>
            </ng-template>
          </div>

          <section class="timeline-section" [attr.aria-label]="lang() === 'ar' ? 'تحديثات الطلب' : 'Order updates'">
            <h2>{{ lang() === 'ar' ? 'تحديثات الطلب' : 'Order updates' }}</h2>
            <ol class="timeline">
              <li *ngFor="let event of order.timeline; trackBy: trackEvent" [class.payment-event]="event.kind === 'payment'">
                <span class="timeline-dot" aria-hidden="true"></span>
                <div>
                  <strong>{{ timelineLabel(event) }}</strong>
                  <time [attr.datetime]="event.occurredAt">{{ formatDateTime(event.occurredAt) }}</time>
                </div>
              </li>
            </ol>
          </section>
        </section>
      </section>
    </main>
  `,
  styles: [`
    :host { display: block; min-height: 70vh; background: #faf7f1; }
    .track-page { width: min(840px, calc(100% - 2rem)); margin: 0 auto; padding: clamp(2rem, 5vw, 4.5rem) 0; }
    .track-shell { overflow: hidden; border: 1px solid rgba(84,33,44,.12); border-radius: 1.5rem; background: #fffdf9; box-shadow: 0 20px 48px rgba(84,33,44,.07); }
    .page-intro { padding: clamp(1.5rem, 5vw, 3.25rem) clamp(1.25rem, 5vw, 3.25rem) 1.25rem; text-align: center; }
    .eyebrow { margin: 0 0 .65rem; color: #a98756; font-size: .72rem; font-weight: 800; letter-spacing: .15em; }
    h1 { margin: 0; color: #45111f; font-family: Georgia, 'Times New Roman', serif; font-size: clamp(2rem, 5vw, 3.4rem); font-weight: 500; }
    .page-intro > p:last-child { max-width: 35rem; margin: .8rem auto 0; color: #82776e; line-height: 1.65; }
    .tracking-form { display: grid; gap: 1rem; padding: clamp(1.25rem, 4vw, 2.5rem); border-top: 1px solid #eee4da; background: #fff; }
    label, fieldset { display: grid; gap: .5rem; min-width: 0; margin: 0; padding: 0; border: 0; }
    label > span, legend { color: #514740; font-size: .82rem; font-weight: 700; }
    input { box-sizing: border-box; width: 100%; min-height: 3rem; border: 1px solid #ded0c0; border-radius: .75rem; outline: none; padding: .7rem .9rem; background: #fffdf9; color: #312724; transition: border-color .15s, box-shadow .15s; }
    input:focus { border-color: #8d573c; box-shadow: 0 0 0 3px rgba(141,87,60,.13); }
    fieldset { gap: .7rem; }
    .verify-switch { display: grid; grid-template-columns: 1fr 1fr; gap: .45rem; padding: .35rem; border-radius: .85rem; background: #f4ece3; }
    .verify-switch button { min-height: 2.6rem; border: 0; border-radius: .6rem; background: transparent; color: #796d64; cursor: pointer; font: inherit; font-size: .82rem; font-weight: 700; }
    .verify-switch button.active { background: #fff; color: #641b2e; box-shadow: 0 2px 7px rgba(74,40,25,.1); }
    .privacy-note { display: flex; align-items: flex-start; gap: .45rem; margin: .1rem 0; color: #74675d; font-size: .78rem; line-height: 1.55; }
    .privacy-note span { color: #a98756; font-size: 1.1rem; line-height: .95; }
    .form-error { margin: 0; border-radius: .7rem; padding: .75rem .9rem; background: #fff4f2; color: #a32d25; font-size: .84rem; }
    .submit-button { min-height: 3rem; border: 0; border-radius: .75rem; background: #641b2e; color: #fff; cursor: pointer; font: inherit; font-weight: 800; transition: background .15s, transform .15s; }
    .submit-button:hover:not(:disabled) { background: #7c263c; transform: translateY(-1px); }
    .submit-button:disabled { cursor: wait; opacity: .68; }
    .result-card { margin: clamp(1.25rem, 4vw, 2.5rem); overflow: hidden; border: 1px solid #e6d9cd; border-radius: 1rem; background: #fff; }
    .result-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.2rem 1.35rem; border-bottom: 1px solid #f0e8df; }
    .result-heading p { margin: 0 0 .25rem; color: #8c7d72; font-size: .72rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
    .result-heading strong { color: #45111f; letter-spacing: .055em; }
    .status-pill { flex: 0 0 auto; border-radius: 999px; padding: .4rem .72rem; background: #f2eadf; color: #795b33; font-size: .78rem; font-weight: 800; }
    .status-pill.shipped, .status-pill.completed { background: #e6f2ea; color: #27723f; }
    .status-pill.cancelled { background: #fbe8e5; color: #aa332a; }
    .facts-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border-bottom: 1px solid #f0e8df; }
    .fact { display: grid; gap: .4rem; min-height: 4.5rem; padding: 1rem 1.35rem; border-bottom: 1px solid #f5eee8; }
    .fact:nth-child(odd) { border-inline-end: 1px solid #f5eee8; }
    .fact:nth-last-child(-n+2) { border-bottom: 0; }
    .fact span { color: #8b7c72; font-size: .72rem; font-weight: 700; }
    .fact strong { color: #413632; font-size: .9rem; }
    .delivery strong { color: #641b2e; }
    .timeline-section { padding: 1.35rem; }
    .timeline-section h2 { margin: 0 0 1rem; color: #45111f; font-family: Georgia, 'Times New Roman', serif; font-size: 1.35rem; font-weight: 500; }
    .timeline { display: grid; gap: 0; margin: 0; padding: 0; list-style: none; }
    .timeline li { position: relative; display: grid; grid-template-columns: 1.1rem 1fr; gap: .75rem; min-height: 3.45rem; }
    .timeline li:not(:last-child)::before { position: absolute; top: 1rem; bottom: -.2rem; inset-inline-start: .48rem; width: 1px; background: #e5d5c4; content: ''; }
    .timeline-dot { z-index: 1; width: .62rem; height: .62rem; margin-top: .23rem; border: 3px solid #f8f0e7; border-radius: 50%; background: #a98756; box-shadow: 0 0 0 1px #c9aa81; }
    .timeline li.payment-event .timeline-dot { background: #641b2e; box-shadow: 0 0 0 1px #8a5663; }
    .timeline li > div { display: grid; gap: .2rem; padding-bottom: .8rem; }
    .timeline strong { color: #413632; font-size: .88rem; }
    .timeline time { color: #8b7c72; font-size: .75rem; }
    @media (max-width: 520px) { .track-page { width: min(100% - 1rem, 840px); padding-block: 1rem; } .track-shell { border-radius: 1rem; } .result-card { margin: 1rem; } .result-heading { align-items: flex-start; flex-direction: column; } .facts-grid { grid-template-columns: 1fr; } .fact, .fact:nth-child(odd) { border-inline-end: 0; border-bottom: 1px solid #f5eee8; } .fact:last-child { border-bottom: 0; } }
  `],
})
export class TrackOrderPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly orders = inject(OrderService);
  private readonly store = inject(StoreService);

  readonly lang = this.store.lang;
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly trackedOrder = signal<TrackedOrder | null>(null);
  readonly verificationMode = signal<'phone' | 'accessCode'>('phone');
  readonly form = this.fb.nonNullable.group({
    orderNumber: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(80)]],
    phone: ['', [Validators.minLength(5), Validators.maxLength(30)]],
    accessCode: ['', [Validators.maxLength(128)]],
  });

  setVerificationMode(mode: 'phone' | 'accessCode'): void {
    this.verificationMode.set(mode);
    this.errorMessage.set('');
  }

  track(): void {
    const value = this.form.getRawValue();
    const proof = this.verificationMode() === 'phone' ? value.phone.trim() : value.accessCode.trim();
    if (this.form.controls.orderNumber.invalid || !proof) {
      this.form.controls.orderNumber.markAsTouched();
      if (this.verificationMode() === 'phone') this.form.controls.phone.markAsTouched();
      else this.form.controls.accessCode.markAsTouched();
      this.errorMessage.set(this.lang() === 'ar' ? 'أدخل رقم الطلب وبيانات التحقق.' : 'Enter an order number and verification detail.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.trackedOrder.set(null);
    this.orders.trackOrder({
      orderNumber: value.orderNumber.trim().toUpperCase(),
      ...(this.verificationMode() === 'phone' ? { phone: proof } : { accessCode: proof }),
    }).subscribe({
      next: ({ data }) => { this.trackedOrder.set(data); this.loading.set(false); },
      error: (_error: HttpErrorResponse) => {
        this.loading.set(false);
        // Never distinguish an unknown order from a failed ownership check.
        this.errorMessage.set(this.lang() === 'ar'
          ? 'تعذّر التحقق من الطلب. تأكد من رقم الطلب وبيانات التحقق ثم حاول مجددًا.'
          : 'We could not verify this order. Check your order number and verification details, then try again.');
      },
    });
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat(this.lang() === 'ar' ? 'ar-EG' : 'en-EG', { dateStyle: 'long' }).format(new Date(value));
  }

  formatDateTime(value: string): string {
    return new Intl.DateTimeFormat(this.lang() === 'ar' ? 'ar-EG' : 'en-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  }

  deliveryRange(order: TrackedOrder): string {
    if (!order.estimatedDelivery) return '';
    const from = this.formatDate(order.estimatedDelivery.from);
    const to = this.formatDate(order.estimatedDelivery.to);
    return from === to ? from : (this.lang() === 'ar' ? `${from} إلى ${to}` : `${from} to ${to}`);
  }

  orderStatusLabel(status: string): string {
    const ar: Record<string, string> = { new: 'تم استلام الطلب', confirmed: 'تم التأكيد', preparing: 'قيد التجهيز', shipped: 'تم الشحن', completed: 'تم التسليم', cancelled: 'ملغي' };
    const en: Record<string, string> = { new: 'Order received', confirmed: 'Confirmed', preparing: 'Preparing', shipped: 'Shipped', completed: 'Delivered', cancelled: 'Cancelled' };
    return (this.lang() === 'ar' ? ar : en)[status] ?? status;
  }

  paymentStatusLabel(status: string): string {
    const ar: Record<string, string> = { pending: 'بانتظار الدفع', awaiting_verification: 'بانتظار التحقق', paid: 'تم الدفع', rejected: 'تعذر قبول الدفع' };
    const en: Record<string, string> = { pending: 'Payment pending', awaiting_verification: 'Awaiting verification', paid: 'Paid', rejected: 'Payment rejected' };
    return (this.lang() === 'ar' ? ar : en)[status] ?? status;
  }

  shippingStatusLabel(status: TrackedOrder['shippingStatus']): string {
    const ar: Record<TrackedOrder['shippingStatus'], string> = { pending: 'قيد انتظار التجهيز', preparing: 'قيد التجهيز', in_transit: 'في الطريق', delivered: 'تم التسليم', cancelled: 'تم إلغاء الشحن' };
    const en: Record<TrackedOrder['shippingStatus'], string> = { pending: 'Awaiting preparation', preparing: 'Preparing shipment', in_transit: 'In transit', delivered: 'Delivered', cancelled: 'Shipment cancelled' };
    return (this.lang() === 'ar' ? ar : en)[status];
  }

  timelineLabel(event: OrderTrackingEvent): string {
    const label = event.kind === 'payment' ? this.paymentStatusLabel(event.status) : this.orderStatusLabel(event.status);
    const prefix = this.lang() === 'ar' ? (event.kind === 'payment' ? 'الدفع: ' : 'الطلب: ') : (event.kind === 'payment' ? 'Payment: ' : 'Order: ');
    return `${prefix}${label}`;
  }

  trackEvent(_index: number, event: OrderTrackingEvent): string {
    return `${event.kind}-${event.status}-${event.occurredAt}`;
  }
}
