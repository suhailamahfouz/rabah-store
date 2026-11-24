import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Product } from '../models/store';
import { OrderService, OrderSummary } from '../services/order.service';
import { StoreService } from '../services/store.service';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="container checkout-shell" [attr.dir]="lang() === 'ar' ? 'rtl' : 'ltr'">
      <div class="checkout-form" *ngIf="!orderSubmitted(); else successState">
        <h1>{{ lang() === 'ar' ? 'إتمام الطلب' : 'Checkout — إتمام الطلب' }}</h1>

        <form [formGroup]="form" (ngSubmit)="submit()" [class.resume-mode]="proofRestored()">
          <div class="grid two-columns">
            <label>
              <span>{{ lang() === 'ar' ? 'الاسم الكامل' : 'Full name — الاسم الكامل' }}</span>
              <input formControlName="name" type="text" />
            </label>
            <label>
              <span>{{ lang() === 'ar' ? 'رقم الهاتف' : 'Phone number — رقم الهاتف' }}</span>
              <input formControlName="phone" type="tel" autocomplete="tel" />
            </label>
          </div>

          <div class="grid two-columns">
            <label>
              <span>{{ lang() === 'ar' ? 'المحافظة' : 'Governorate — المحافظة' }}</span>
              <select formControlName="governorate" autocomplete="address-level1">
                <option value="" disabled>{{ lang() === 'ar' ? 'اختاري المحافظة' : 'Select governorate — اختاري المحافظة' }}</option>
                <option *ngFor="let governorate of shippingGovernorates()" [value]="governorate">{{ governorate }}</option>
              </select>
            </label>
            <label>
              <span>{{ lang() === 'ar' ? 'المدينة / المنطقة' : 'City / area — المدينة / المنطقة' }}</span>
              <select formControlName="city" autocomplete="address-level2">
                <option value="" disabled>{{ lang() === 'ar' ? 'اختاري المنطقة' : 'Select area — اختاري المنطقة' }}</option>
                <option *ngFor="let area of shippingAreas()" [value]="area">{{ area }}</option>
                <option *ngIf="coversWholeGovernorate()" [value]="selectedGovernorate()">{{ lang() === 'ar' ? 'كل المناطق — اكتبي المنطقة في العنوان بالتفصيل' : 'All areas — كل المناطق، اكتبي المنطقة في العنوان بالتفصيل' }}</option>
              </select>
            </label>
          </div>

          <p class="feedback" *ngIf="!shippingGovernorates().length">{{ lang() === 'ar' ? 'لا توجد مناطق توصيل متاحة حاليًا. يرجى المحاولة لاحقًا.' : 'No delivery locations available — لا توجد مناطق توصيل متاحة حاليًا.' }}</p>
          <label>
            <span>{{ lang() === 'ar' ? 'العنوان بالتفصيل' : 'Detailed address — العنوان بالتفصيل' }}</span>
            <textarea formControlName="address" rows="3" autocomplete="street-address" [placeholder]="lang() === 'ar' ? 'اسم الشارع، رقم المبنى، الدور ورقم الشقة' : 'Street, building, floor, apartment — الشارع، المبنى، الدور، الشقة'"></textarea>
          </label>

          <div class="payment-method">
            <span>{{ lang() === 'ar' ? 'طريقة الدفع' : 'Payment method — طريقة الدفع' }}</span>
            <div class="payment-options">
              <label class="payment-option" [class.active]="selectedPaymentMethod() === 'cod'">
                <input type="radio" name="paymentMethod" [checked]="selectedPaymentMethod() === 'cod'" (change)="selectedPaymentMethod.set('cod')" />
                <span>{{ lang() === 'ar' ? 'الدفع عند الاستلام' : 'Cash on delivery — الدفع عند الاستلام' }}</span>
              </label>
              <label class="payment-option" [class.active]="selectedPaymentMethod() === 'instapay'" [class.disabled]="!store.storeSettings().instapay?.enabled">
                <input type="radio" name="paymentMethod" [checked]="selectedPaymentMethod() === 'instapay'" [disabled]="!store.storeSettings().instapay?.enabled" (change)="selectedPaymentMethod.set('instapay')" />
                <span>InstaPay — إنستا باي</span>
              </label>
            </div>
          </div>

          <div class="instapay-instructions" *ngIf="selectedPaymentMethod() === 'instapay' && store.storeSettings().instapay?.enabled">
            <p class="instapay-line"><strong>{{ lang() === 'ar' ? 'رقم الحساب' : 'Account number — رقم الحساب' }}</strong>: {{ store.storeSettings().instapay.identifier }}</p>
            <p class="instapay-line" *ngIf="store.storeSettings().instapay.accountName"><strong>{{ lang() === 'ar' ? 'اسم الحساب' : 'Account name — اسم الحساب' }}</strong>: {{ store.storeSettings().instapay.accountName }}</p>
            <p class="instapay-note">
              {{
                lang() === 'ar'
                  ? 'قُم بتحويل المبلغ ثم ارفق صورة إثبات التحويل هنا.'
                  : 'Transfer the amount, then attach proof here — حوّلي المبلغ ثم أرفقي صورة إثبات التحويل هنا.'
              }}
            </p>
          </div>

          <p class="feedback error" *ngIf="errorMessage()" role="alert">{{ errorMessage() }}</p>

          <div class="proof-upload" *ngIf="selectedPaymentMethod() === 'instapay' && order()?.orderNumber">
            <p class="proof-label" *ngIf="proofRestored()">
              {{ lang() === 'ar'
                ? 'طلبك رقم ' + order()?.orderNumber + ' اتسجل. ارفعي صورة التحويل هنا عشان نراجعه، مش محتاجة تعملي طلب جديد.'
                : 'Your order ' + order()?.orderNumber + ' is already placed. Upload your transfer screenshot here, no need to order again.' }}
            </p>
            <p class="proof-label">
              {{
                lang() === 'ar'
                  ? 'ارفع صورة إثبات التحويل (PNG / JPG / WEBP، أقصى ٥ ميجابايت)'
                  : 'Upload transfer proof — رفع إثبات التحويل (PNG / JPG / WEBP، 5 MB)'
              }}
            </p>
            <label class="proof-drop" [class.has-file]="proofFileName()">
              <input type="file" accept="image/png,image/jpeg,image/webp,image/heic" (change)="onProofFileSelected($event)" />
              <span *ngIf="!proofFileName()">{{ lang() === 'ar' ? 'اختر صورة...' : 'Choose an image... — اختاري صورة' }}</span>
              <span *ngIf="proofFileName()" class="file-name">{{ proofFileName() }}</span>
            </label>
            <img *ngIf="proofPreviewUrl()" [src]="proofPreviewUrl()" class="proof-preview" alt="" />
            <p class="feedback error" *ngIf="proofError()" role="alert">{{ proofError() }}</p>
            <p class="proof-status" *ngIf="proofUploading()">
              {{ lang() === 'ar' ? 'جارٍ رفع صورة الإثبات...' : 'Uploading proof... — جارٍ رفع الإثبات' }}
            </p>
          </div>

          <button
            type="submit"
            class="submit-btn"
            [disabled]="form.invalid || !shippingSelectionValid() || shippingLoading() || isSubmitting() || shippingUnavailable() || !cartItems().length"
          >
            {{
              isSubmitting()
                ? lang() === 'ar'
                  ? 'جارٍ تأكيد الطلب...'
                  : 'Placing your order... — جارٍ تأكيد الطلب'
                : lang() === 'ar'
                  ? 'تأكيد الطلب'
                  : 'Place order — تأكيد الطلب'
            }}
          </button>
        </form>
      </div>

      <aside class="summary-card" *ngIf="!orderSubmitted() && !proofRestored()">
        <h2>{{ lang() === 'ar' ? 'ملخص الطلب' : 'Order summary — ملخص الطلب' }}</h2>
        <div class="summary-list">
          <div class="summary-row" *ngFor="let item of cartItems()">
            <span>{{ item.product.name[lang()] }} × {{ item.quantity }}<small class="item-note" *ngIf="item.color">{{ lang() === 'ar' ? 'اللون: ' : 'Colour — اللون: ' }}{{ item.colorName }}</small><small class="item-note" *ngIf="item.note">{{ lang() === 'ar' ? 'ملحوظة: ' : 'Note: ' }}{{ item.note }}</small></span>
            <strong>{{ item.product.price * item.quantity }} {{ currency() }}</strong>
          </div>
        </div>
        <div class="summary-row shipping">
          <span>{{ lang() === 'ar' ? 'الشحن' : 'Shipping — الشحن' }}</span>
          <strong *ngIf="shippingLoading() || !shippingSelectionValid()">{{ lang() === 'ar' ? 'يُحسب بعد اختيار العنوان' : 'Calculated after selection — يُحسب بعد اختيار العنوان' }}</strong>
          <strong *ngIf="!shippingLoading() && shippingSelectionValid() && shippingUnavailable()">{{ lang() === 'ar' ? 'غير متاح' : 'Unavailable — غير متاح' }}</strong>
          <strong *ngIf="!shippingLoading() && shippingSelectionValid() && !shippingUnavailable() && shippingFee() > 0">{{ shippingFee() }} {{ currency() }}</strong>
          <strong *ngIf="!shippingLoading() && shippingSelectionValid() && !shippingUnavailable() && shippingFee() === 0">{{ lang() === 'ar' ? 'مجاني' : 'Free — مجاني' }}</strong>
        </div>
        <small class="delivery-estimate" *ngIf="deliveryDays().min && deliveryDays().max">
          {{ lang() === 'ar' ? '?اختاري المنطقة:' : 'Estimated delivery ? ?اختاري المنطقة:' }} {{ deliveryDays().min }} - {{ deliveryDays().max }} {{ lang() === 'ar' ? 'أيام' : 'days / أيام' }}
        </small>
        <div class="summary-row total">
          <span>{{ lang() === 'ar' ? 'الإجمالي' : 'Total — الإجمالي' }}</span>
          <strong>{{ subtotal() + shippingFee() }} {{ currency() }}</strong>
        </div>
      </aside>
    </section>

    <ng-template #successState>
      <section class="container success-box" [attr.dir]="lang() === 'ar' ? 'rtl' : 'ltr'">
        <span class="success-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="m5 12 4.5 4.5L19 7"></path></svg>
        </span>
        <p class="success-eyebrow">
          {{ lang() === 'ar' ? 'شكراً لثقتك برابح' : 'THANK YOU FOR CHOOSING RABAH' }}
        </p>
        <h2>{{ lang() === 'ar' ? 'تم استلام طلبك بنجاح' : 'Your order is confirmed — تم استلام طلبك بنجاح' }}</h2>
        <p class="success-copy">
          {{
            lang() === 'ar'
              ? 'احتفظي برقم الطلب للرجوع إليه عند التواصل معنا.'
              : 'Keep your order number handy if you need to contact us.'
          }}
        </p>
        <p class="success-copy" *ngIf="selectedPaymentMethod() === 'instapay' && !proofFileName()">
          {{
            lang() === 'ar'
              ? 'الآن ارفق صورة إثبات التحويل ليتم مراجعتها من قبل فريق RABAH.'
              : 'Now attach a screenshot of your transfer for review by the RABAH team.'
          }}
        </p>
        <div class="order-number">
          <span>{{ lang() === 'ar' ? 'رقم الطلب' : 'ORDER NUMBER — رقم الطلب' }}</span>
          <strong dir="ltr">{{ order()?.orderNumber }}</strong>
        </div>
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

      .checkout-shell {
        display: grid;
        grid-template-columns: 1.1fr 0.9fr;
        gap: 2rem;
        padding: 2.5rem 0 4rem;
      }

      .checkout-form,
      .summary-card,
      .success-box {
        background: white;
        border: 1px solid rgba(17, 24, 39, 0.06);
        border-radius: 1.5rem;
        padding: 1.5rem;
      }

      h1,
      h2 {
        margin-top: 0;
      }

      form {
        display: grid;
        gap: 1rem;
      }

      .grid.two-columns {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
      }

      label {
        display: grid;
        gap: 0.5rem;
        color: #3d3835;
        font-weight: 600;
      }

      input,
      select,
      textarea {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid rgba(49, 46, 43, 0.12);
        border-radius: 0.9rem;
        padding: 0.85rem 1rem;
        font: inherit;
        background: white;
        color: inherit;
      }

      .payment-method {
        display: grid;
        gap: 0.5rem;
        padding: 0.85rem 1rem;
        border: 1px solid rgba(184, 154, 99, 0.4);
        background: #faf7f1;
        color: #641b2e;
      }

      .payment-method span {
        color: #706963;
        font-size: 0.8rem;
        font-weight: 400;
      }

      .summary-card {
        background: #1f1b1a;
        color: white;
      }

      .summary-list {
        display: grid;
        gap: 0.9rem;
      }

      .summary-row {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        padding-bottom: 0.9rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }

      .summary-row.total {
        border-bottom: none;
        margin-top: 1rem;
        font-size: 1.15rem;
        font-weight: 700;
      }

      .submit-btn {
        border: none;
        background: linear-gradient(135deg, #8d573c, #d3a06f);
        color: white;
        border-radius: 999px;
        padding: 0.95rem 1.3rem;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
      }

      .submit-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      /* After a refresh only the placed-order note and the upload box are useful. */
      .resume-mode > :not(.proof-upload):not(.instapay-instructions) {
        display: none;
      }

      .proof-upload {
        margin-top: 1rem;
        display: grid;
        gap: 0.7rem;
      }

      .proof-label {
        font-size: 0.82rem;
        color: #5d5752;
      }

      .proof-drop {
        display: flex;
        align-items: center;
        gap: 0.8rem;
        padding: 0.85rem 1rem;
        border: 1.5px dashed rgba(184, 154, 99, 0.6);
        border-radius: 0.9rem;
        background: #faf7f1;
        cursor: pointer;
        overflow: hidden;
      }

      .proof-drop input[type='file'] {
        display: none;
      }

      .proof-drop.has-file {
        border-color: #641b2e;
      }

      .file-name {
        font-weight: 600;
        color: #641b2e;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .proof-preview {
        width: 100%;
        max-width: 320px;
        max-height: 240px;
        object-fit: contain;
        border-radius: 0.9rem;
        border: 1px solid rgba(17, 24, 39, 0.08);
      }

      .proof-status {
        font-size: 0.82rem;
        color: #8d573c;
      }

      .success-box {
        text-align: center;
        padding: 4rem 2rem;
        margin: 2rem auto 4rem;
        max-width: 620px;
        color: #29221f;
      }

      .success-mark {
        display: grid;
        width: 3.5rem;
        height: 3.5rem;
        place-items: center;
        margin: 0 auto 1.5rem;
        border: 1px solid rgba(184, 154, 99, 0.45);
        border-radius: 50%;
        background: #faf7f1;
        color: #641b2e;
      }

      .success-mark svg {
        width: 1.5rem;
        height: 1.5rem;
        fill: none;
        stroke: currentColor;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 1.8;
      }

      .success-eyebrow {
        margin: 0 0 0.55rem;
        color: #b89a63;
        font-size: 0.68rem;
        letter-spacing: 0.13em;
      }

      .success-box h2 {
        color: #641b2e;
        font-family: Georgia, 'Times New Roman', serif;
        font-size: clamp(1.7rem, 4vw, 2.3rem);
        font-weight: 400;
      }

      .success-copy {
        color: #706963;
        line-height: 1.7;
      }

      .order-number {
        display: grid;
        gap: 0.55rem;
        width: min(360px, 100%);
        box-sizing: border-box;
        margin: 1.5rem auto 0;
        padding: 1rem;
        border: 1px dashed rgba(100, 27, 46, 0.3);
        background: #faf7f1;
      }

      .order-number span {
        color: #82776e;
        font-size: 0.68rem;
        letter-spacing: 0.12em;
      }

      .order-number strong {
        color: #641b2e;
        font-size: 1.2rem;
        letter-spacing: 0.08em;
      }

      .feedback {
        margin: 0;
        font-size: 0.88rem;
      }

      .error {
        color: #b42318;
      }

      @media (max-width: 820px) {
        .checkout-shell,
        .grid.two-columns {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class CheckoutPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(StoreService);
  private readonly orders = inject(OrderService);

  readonly lang = this.store.lang;
  readonly currency = this.store.currency;
  private readonly destroyRef = inject(DestroyRef);
  private quoteSubscription?: Subscription;
  readonly selectedGovernorate = signal('');
  readonly shippingLoading = signal(false);
  readonly shippingFee = signal(0);
  readonly shippingUnavailable = signal(false);
  readonly deliveryDays = signal<{ min?: number; max?: number }>({});
  readonly shippingGovernorates = computed(() => [...new Set((this.store.storeSettings().shipping?.zones ?? []).filter((zone) => zone.isActive).flatMap((zone) => zone.governorates))]);
  readonly shippingAreas = computed(() => {
    const governorate = this.selectedGovernorate();
    return [...new Set((this.store.storeSettings().shipping?.zones ?? []).filter((zone) => zone.isActive && zone.governorates.includes(governorate)).flatMap((zone) => zone.areas ?? []))];
  });
  readonly coversWholeGovernorate = computed(() => !!this.selectedGovernorate() && (this.store.storeSettings().shipping?.zones ?? []).some(zone => zone.isActive && zone.governorates.includes(this.selectedGovernorate()) && !zone.areas?.length));
  shippingSelectionValid(): boolean {
    const { governorate, city } = this.form.getRawValue();
    return this.shippingGovernorates().includes(governorate) && (this.shippingAreas().includes(city) || (this.coversWholeGovernorate() && city === governorate));
  }
  readonly orderSubmitted = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly order = signal<OrderSummary | null>(null);
  readonly selectedPaymentMethod = signal<'cod' | 'instapay'>('cod');
  readonly proofUploading = signal(false);
  readonly proofPreviewUrl = signal<string | null>(null);
  readonly proofFileName = signal('');
  readonly proofError = signal('');
  // Authorizes the payment-proof upload. It is kept in component memory and,
  // only for InstaPay orders still waiting for a proof, in this tab's
  // sessionStorage so a refresh does not lose the upload step. It is never put
  // in the URL or localStorage, is removed once the proof is uploaded or the
  // server refuses it, and is ignored after 24 hours.
  readonly proofAccessToken = signal('');
  readonly proofRestored = signal(false);
  private idempotencyKey = crypto.randomUUID();

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.minLength(5)]],
    governorate: ['', [Validators.required, Validators.minLength(2)]],
    city: ['', [Validators.required, Validators.minLength(2)]],
    address: ['', [Validators.required, Validators.minLength(5)]],
  });

  constructor() {
    this.restorePendingProof();
    this.form.controls.governorate.valueChanges.pipe(takeUntilDestroyed()).subscribe(value => {
      this.selectedGovernorate.set(value);
      this.form.controls.city.setValue('', { emitEvent: false });
      this.refreshShippingQuote();
    });
    this.form.controls.city.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.refreshShippingQuote());
    this.destroyRef.onDestroy(() => this.quoteSubscription?.unsubscribe());
  }

  readonly cartItems = computed(() =>
    this.store
      .cart()
      .map((item) => {
        const product = this.store.getProductById(item.productId);
        return product ? { product, quantity: item.quantity, note: item.note, color: item.color, colorName: this.store.colorName(product, item.color) } : null;
      })
      .filter((item): item is NonNullable<typeof item> => !!item),
  );

  readonly subtotal = computed(() => this.store.subtotal);

  submit(): void {
    if (this.form.invalid || !this.shippingSelectionValid() || this.shippingLoading() || !this.cartItems().length || this.isSubmitting() || this.shippingUnavailable()) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.selectedPaymentMethod() === 'instapay' && !this.store.storeSettings().instapay?.enabled) {
      this.errorMessage.set(this.lang() === 'ar' ? 'InstaPay غير متاح حاليًا.' : 'InstaPay is not available right now.');
      return;
    }

    this.errorMessage.set('');
    this.isSubmitting.set(true);
    const form = this.form.getRawValue();
    this.orders
      .createOrder({
        idempotencyKey: this.idempotencyKey,
        customer: {
          fullName: form.name.trim(),
          phone: form.phone.trim(),
          governorate: form.governorate.trim(),
          city: form.city.trim(),
          address: form.address.trim(),
        },
        items: this.cartItems().map(({ product, quantity, note, color }) => ({
          ...(color ? { color } : {}),
          productSlug: product.slug,
          quantity,
          note: note?.trim() || undefined,
        })),
        paymentMethod: this.selectedPaymentMethod(),
        currency: 'EGP',
      })
      .subscribe({
        next: ({ data }) => {
          const { accessToken, ...order } = data;
          this.order.set(order);
          this.proofAccessToken.set(accessToken ?? '');
          if (this.selectedPaymentMethod() === 'instapay' && accessToken) this.savePendingProof(order, accessToken);
          this.store.clearCart();
          this.isSubmitting.set(false);
          this.idempotencyKey = crypto.randomUUID();
          if (this.selectedPaymentMethod() === 'instapay') {
            this.proofUploading.set(false); // waiting for the customer to choose a file, not uploading yet
            this.proofError.set('');
          } else {
            this.orderSubmitted.set(true);
          }
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(
            error.error?.error?.message ??
              (this.lang() === 'ar'
                ? 'تعذر تأكيد الطلب الآن. تحققي من اتصال الإنترنت وحاولي مرة أخرى.'
                : 'We could not place your order. Check your connection and try again.'),
          );
        },
      });
  }

  private static readonly PENDING_PROOF_KEY = 'rabah-pending-proof-v1';
  private static readonly PENDING_PROOF_TTL_MS = 24 * 60 * 60 * 1000;

  private savePendingProof(order: Omit<OrderSummary, 'accessToken'>, accessToken: string): void {
    try {
      sessionStorage.setItem(CheckoutPageComponent.PENDING_PROOF_KEY, JSON.stringify({
        orderNumber: order.orderNumber, id: order.id, total: order.total, currency: order.currency,
        paymentMethod: order.paymentMethod, createdAt: order.createdAt, accessToken, savedAt: Date.now(),
      }));
    } catch { /* storage unavailable (private mode): the upload step just won't survive a refresh */ }
  }

  private clearPendingProof(): void {
    try { sessionStorage.removeItem(CheckoutPageComponent.PENDING_PROOF_KEY); } catch { /* ignore */ }
  }

  private restorePendingProof(): void {
    try {
      const raw = sessionStorage.getItem(CheckoutPageComponent.PENDING_PROOF_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { orderNumber?: string; accessToken?: string; savedAt?: number; id?: string; total?: number; currency?: string; paymentMethod?: string; createdAt?: string };
      const fresh = typeof saved.savedAt === 'number' && Date.now() - saved.savedAt < CheckoutPageComponent.PENDING_PROOF_TTL_MS;
      if (!fresh || !saved.orderNumber || !/^[a-f\d]{64}$/i.test(saved.accessToken ?? '')) {
        this.clearPendingProof();
        return;
      }
      this.order.set({
        id: saved.id ?? '', orderNumber: saved.orderNumber, status: 'new', paymentStatus: 'pending', paymentMethod: 'instapay',
        currency: saved.currency ?? 'EGP', subtotal: 0, shippingFee: 0, shippingGovernorate: '', shippingArea: '',
        total: saved.total ?? 0, createdAt: saved.createdAt ?? '',
      } as OrderSummary);
      this.proofAccessToken.set(saved.accessToken as string);
      this.selectedPaymentMethod.set('instapay');
      this.proofRestored.set(true);
    } catch {
      this.clearPendingProof();
    }
  }

  onProofFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!/^image\/(png|jpe?g|webp|heic)$/i.test(file.type)) {
      this.proofError.set(this.lang() === 'ar' ? 'اختر صورة PNG أو JPG أو WEBP.' : 'Choose a PNG, JPG or WEBP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.proofError.set(this.lang() === 'ar' ? 'الصورة كبيرة جدًا (أقصى ٥ ميجابايت).' : 'Image is too large (max 5 MB).');
      return;
    }

    this.proofError.set('');
    this.proofFileName.set(file.name);
    this.proofPreviewUrl.set(URL.createObjectURL(file));

    const order = this.order();
    if (!order) return;
    const accessToken = this.proofAccessToken();
    if (!accessToken) {
      this.proofError.set(this.lang() === 'ar' ? 'انتهت جلسة رفع الإثبات. يُرجى إنشاء طلب جديد.' : 'The proof-upload session has expired. Please create a new order.');
      return;
    }
    this.proofUploading.set(true);
    this.orders.uploadProof(order.orderNumber, accessToken, file).subscribe({
      next: () => {
        this.proofUploading.set(false);
        this.proofAccessToken.set('');
        this.clearPendingProof();
        this.orderSubmitted.set(true);
      },
      error: (error: HttpErrorResponse) => {
        this.proofUploading.set(false);
        // The server refused this order or token for good (wrong token, paid, cancelled): stop offering the upload.
        if (error.status === 403 || error.status === 404 || error.status === 409) {
          this.proofAccessToken.set('');
          this.clearPendingProof();
        }
        this.proofError.set(
          error.error?.error?.message ??
            (this.lang() === 'ar' ? 'تعذّر رفع صورة الإثبات. جرب مرة أخرى.' : 'Could not upload the proof image. Try again.'),
        );
      },
    });
  }

  private refreshShippingQuote(): void {
    this.quoteSubscription?.unsubscribe();
    this.shippingLoading.set(false);
    this.errorMessage.set('');
    const value = this.form.controls.governorate.value.trim();
    const area = this.form.controls.city.value.trim();
    if (!this.shippingSelectionValid() || !this.cartItems().length) {
      this.shippingFee.set(0);
      this.deliveryDays.set({});
      this.shippingUnavailable.set(false);
      return;
    }
    this.shippingLoading.set(true);
    this.quoteSubscription = this.orders.shippingQuote(this.subtotal(), value, area || undefined).subscribe({
      next: ({ data }) => {
        this.shippingLoading.set(false);
        this.shippingFee.set(data.fee);
        this.deliveryDays.set({ min: data.estimatedDaysMin, max: data.estimatedDaysMax });
        this.shippingUnavailable.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.shippingLoading.set(false);
        this.shippingFee.set(0);
        this.deliveryDays.set({});
        this.shippingUnavailable.set(true);
        this.errorMessage.set(
          error.error?.error?.message ??
          (this.lang() === 'ar' ? 'الشحن غير متاح للعنوان المحدد.' : 'Shipping is unavailable for this address.'),
        );
      },
    });
  }
}
