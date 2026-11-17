import { Component, DestroyRef, inject, signal, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-storefront-skeleton',
  imports: [CommonModule],
  template: `
    <div class="loading-region" [attr.dir]="lang === 'ar' ? 'rtl' : 'ltr'" [attr.aria-busy]="!failed">
      <div *ngIf="!failed" class="skeleton-grid" [class.detail]="detail" role="status" [attr.aria-label]="lang === 'ar' ? 'جارٍ تحميل المجموعة' : 'Loading collection'">
        <div class="skeleton-card" *ngFor="let item of cards" aria-hidden="true">
          <div class="placeholder picture"></div><div class="placeholder line"></div><div class="placeholder short"></div>
        </div>
      </div>
      <p class="slow-note" *ngIf="!failed && takingLonger()" role="status">{{ lang === 'ar' ? 'نجهّز المجموعة لكِ، قد يستغرق الاتصال لحظات إضافية.' : 'Getting your collection ready. The connection is taking a little longer.' }}</p>
      <div *ngIf="failed" class="recovery" role="status">
        <p>{{ lang === 'ar' ? 'تعذر تحميل المجموعة الآن. حاولي مرة أخرى.' : 'We couldn’t load the collection. Please try again.' }}</p>
        <button type="button" (click)="retry.emit()">{{ lang === 'ar' ? 'إعادة المحاولة' : 'Try again' }}</button>
      </div>
    </div>`,
  styles: [`
    :host{display:block} .loading-region{padding:1.5rem 0;animation:reveal .3s ease-out}
    .skeleton-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1.5rem 1rem}
    .placeholder{position:relative;overflow:hidden;background:#eae6e1;border-radius:6px}
    .placeholder::after{content:'';position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(100deg,transparent,rgba(255,255,255,.48),transparent);animation:shimmer 1.8s ease-in-out infinite}
    .picture{aspect-ratio:3/4;border-radius:18px}.line{height:12px;width:85%;margin-top:16px}.short{height:10px;width:40%;margin-top:10px}
    .detail .skeleton-card:first-child{grid-column:1/-1}.detail .skeleton-card:first-child .picture{aspect-ratio:1}
    .slow-note{text-align:center;font-size:.85rem;color:#78695f;margin:1.5rem 0}
    .recovery{padding:2rem 1rem;text-align:center;background:#f0ece7;border-radius:18px;color:#54212c}
    button{border:0;border-radius:30px;background:#651d32;color:white;padding:.8rem 1.6rem;font:inherit;cursor:pointer}
    button:focus-visible{outline:2px solid #651d32;outline-offset:4px}
    @media(min-width:768px){.skeleton-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:1.5rem}.detail{grid-template-columns:1fr 1fr}.detail .skeleton-card:first-child{grid-column:auto}}
    @keyframes shimmer{to{transform:translateX(100%)}}@keyframes reveal{from{opacity:0}to{opacity:1}}
    @media(prefers-reduced-motion:reduce){.placeholder::after{animation:none}.loading-region{animation:none}}
  `],
})
export class StorefrontSkeletonComponent {
  readonly takingLonger = signal(false);
  constructor() {
    const timer = setTimeout(() => this.takingLonger.set(true), 8000);
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  }
  @Input() lang: 'ar' | 'en' = 'ar';
  @Input() failed = false;
  @Input() detail = false;
  @Output() retry = new EventEmitter<void>();
  get cards(): number[] { return this.detail ? [0, 1] : [0, 1, 2, 3]; }
}
