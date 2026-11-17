import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { StoreService } from '../services/store.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="site-footer" [attr.dir]="store.lang() === 'ar' ? 'rtl' : 'ltr'">
      <div class="container">
        <div class="footer-top">
          <div class="footer-brand">
            <p class="eyebrow"><img class="footer-logo" [src]="store.storeSettings().logoUrl || '/logo-gold.png'" [alt]="store.storeSettings().storeName" /></p>
            <h3>{{ store.lang() === 'ar' ? 'أناقة لكل يوم.' : 'Everyday elegance, thoughtfully chosen.' }}</h3>
            <p class="brand-note">{{ store.lang() === 'ar' ? 'اختيارات مميزة تضيف لمسة جميلة لكل تفاصيل يومك.' : 'Thoughtfully chosen pieces to make every day feel a little more special.' }}</p>
          </div>
          <nav class="footer-links" [attr.aria-label]="store.lang() === 'ar' ? 'روابط سريعة' : 'Quick links'">
            <span class="links-title">{{ store.lang() === 'ar' ? 'روابط سريعة' : 'Quick links' }}</span>
            <a href="/">{{ store.lang() === 'ar' ? 'الرئيسية' : 'Home' }}</a>
            <a href="/catalog">{{ store.lang() === 'ar' ? 'التصنيفات' : 'Categories' }}</a>
            <a href="/checkout">{{ store.lang() === 'ar' ? 'إتمام الطلب' : 'Checkout' }}</a>
          </nav>
        </div>
        <section class="social-links" [attr.aria-label]="store.lang() === 'ar' ? 'تابعونا وتواصلوا معنا' : 'Follow and contact us'">
          <h4>{{ store.lang() === 'ar' ? 'خلّينا على تواصل' : 'Let’s stay connected' }}</h4>
          <p>{{ store.lang() === 'ar' ? 'تابعونا على السوشيال ميديا أو ابعتولنا في أي وقت' : 'Follow us on social media or get in touch anytime.' }}</p>
          <div class="contact-details" *ngIf="store.storeSettings().contact.phone || store.storeSettings().contact.email">
            <a *ngIf="store.storeSettings().contact.phone" [href]="'tel:' + store.storeSettings().contact.phone">{{ store.storeSettings().contact.phone }}</a>
            <a *ngIf="store.storeSettings().contact.email" [href]="'mailto:' + store.storeSettings().contact.email">{{ store.storeSettings().contact.email }}</a>
          </div>
          <div class="social-list">
            <a [href]="store.storeSettings().social.instagram || 'https://www.instagram.com/raba7_store7407?dlrf=OWpueHFjcGpxb2Jy'" target="_blank" rel="noopener noreferrer" [attr.aria-label]="store.lang() === 'ar' ? 'إنستغرام' : 'Instagram'" title="Instagram">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle class="icon-dot" cx="18" cy="6.5" r="1"></circle></svg>
            </a>
            <a [href]="store.storeSettings().social.facebook || 'https://www.facebook.com/share/1EDmGY8ytQ/?mibextid=wwXIfr'" target="_blank" rel="noopener noreferrer" [attr.aria-label]="store.lang() === 'ar' ? 'فيسبوك' : 'Facebook'" title="Facebook">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path class="facebook-mark" d="M13.5 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.1H7.3V13h2.8v8h3.4Z"></path></svg>
            </a>
            <a [href]="store.storeSettings().social.tiktok || 'https://www.tiktok.com/@raba7store?_r=1&amp;_t=ZS-9BM3BXgrN6U'" target="_blank" rel="noopener noreferrer" [attr.aria-label]="store.lang() === 'ar' ? 'تيك توك' : 'TikTok'" title="TikTok">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.6 3c.3 2 1.4 3.2 3.4 3.3v3.2a8.3 8.3 0 0 1-3.4-.9v6.2a6.2 6.2 0 1 1-6.2-6.2c.4 0 .8 0 1.2.1V12a3 3 0 1 0 1.8 2.8V3h3.2Z"></path></svg>
            </a>
            <a [href]="whatsappUrl()" target="_blank" rel="noopener noreferrer" [attr.aria-label]="store.lang() === 'ar' ? 'واتساب' : 'WhatsApp'" title="WhatsApp">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.7a8 8 0 0 1-11.8 7l-4.2 1.1 1.1-4.1A8 8 0 1 1 20 11.7Z"></path><path d="M9 8.2c.2-.4.4-.4.7-.4h.4c.2 0 .3.1.4.4l.7 1.7c.1.2 0 .4-.1.6l-.5.6c-.2.2-.2.4 0 .6.5.8 1.2 1.5 2 1.9.2.1.4.1.5-.1l.7-.8c.2-.2.4-.2.6-.1l1.6.8c.2.1.3.2.3.4 0 .3-.2 1-.7 1.4-.5.4-1.1.6-1.7.5-1-.2-2.3-.8-3.6-2-1.1-1-1.9-2.3-2.1-3.3-.2-.9.1-1.7.8-2.2Z"></path></svg>
            </a>
            <a href="https://t.me/Raba7_Store" target="_blank" rel="noopener noreferrer" [attr.aria-label]="store.lang() === 'ar' ? 'تيليجرام' : 'Telegram'" title="Telegram">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 4-3.2 16c-.2 1.1-.9 1.4-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.3L5.2 13.4.3 11.9c-1.1-.4-1.1-1.1.2-1.6L19.6 3c.9-.3 1.7.2 1.4 1Z"></path></svg>
            </a>
          </div>
        </section>
        <div class="footer-bottom">
          <span>© 2026 RABAH {{ store.lang() === 'ar' ? '— جميع الحقوق محفوظة' : '— All rights reserved' }}</span>
          <span>{{ store.lang() === 'ar' ? 'صُمم بحب لكل يوم' : 'Made for everyday living' }}</span>
        </div>
      </div>
    </footer>
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

      .site-footer {
        position: relative;
        overflow: hidden;
        border-top: 3px solid #d7b28a;
        background:
          radial-gradient(ellipse at 50% 100%, rgba(114, 59, 57, 0.2), transparent 55%),
          linear-gradient(135deg, #211c1a, #171514 70%);
        color: #f5efe8;
        padding: 3.25rem 0 1.25rem;
      }

      .footer-top {
        display: grid;
        grid-template-columns: minmax(0, 1.5fr) minmax(180px, 0.7fr);
        justify-content: space-between;
        align-items: center;
        gap: 3rem;
        padding-bottom: 2rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .footer-brand {
        max-width: 34rem;
      }

      .social-links {
        padding: 2rem 0;
        text-align: center;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .social-links h4 {
        margin: 0;
        color: #f5efe8;
        font-size: 1.1rem;
      }

      .social-links p {
        margin: 0.4rem 0 1.1rem;
        color: rgba(245, 239, 232, 0.62);
        font-size: 0.88rem;
        text-align: center;
      }

      .contact-details {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 1rem;
        margin: 0 0 1.1rem;
        font-size: 0.85rem;
      }

      .contact-details a {
        color: #e7d8c8;
        text-decoration: none;
      }

      .social-list {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 0.75rem;
      }

      .social-list a {
        display: grid;
        width: 3rem;
        height: 3rem;
        place-items: center;
        color: #e7d8c8;
        text-decoration: none;
        border: 1px solid rgba(215, 178, 138, 0.28);
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.035);
        transition: transform 180ms ease, border-color 180ms ease, color 180ms ease, background 180ms ease;
      }

      .social-list svg {
        width: 1.25rem;
        height: 1.25rem;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.8;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .social-list .facebook-mark,
      .social-list a:nth-child(3) svg,
      .social-list a:nth-child(4) svg,
      .social-list a:nth-child(5) svg {
        fill: currentColor;
        stroke: none;
      }

      .social-list .icon-dot {
        fill: currentColor;
        stroke: none;
      }

      .social-list a:hover,
      .social-list a:focus-visible {
        color: #211c1a;
        border-color: #d7b28a;
        background: #d7b28a;
        transform: translateY(-3px);
      }

      .social-list a:focus-visible,
      .footer-links a:focus-visible {
        outline: 2px solid #f5efe8;
        outline-offset: 3px;
      }

      .eyebrow {
        display: flex;
        align-items: center;
        gap: 0.55rem;
        margin: 0 0 0.9rem;
        color: #d7b28a;
        letter-spacing: 0.16em;
        font-size: 0.82rem;
        font-weight: 700;
      }

      .footer-logo {
        display: block;
        width: min(10rem, 45vw);
        height: 3.25rem;
        object-fit: contain;
        object-position: start center;
      }

      .brand-note {
        max-width: 28rem;
        margin: 0.75rem 0 0;
        color: rgba(245, 239, 232, 0.64);
        line-height: 1.8;
      }

      h3 {
        margin: 0;
        max-width: 32rem;
        font-size: clamp(1.5rem, 2.6vw, 2.25rem);
        line-height: 1.35;
      }

      .footer-links {
        display: grid;
        justify-items: start;
        gap: 0.8rem;
      }

      .links-title {
        margin-bottom: 0.15rem;
        color: #d7b28a;
        font-size: 0.85rem;
        font-weight: 700;
      }

      .footer-links a {
        color: rgba(245, 239, 232, 0.72);
        text-decoration: none;
        transition: color 160ms ease, transform 160ms ease;
      }

      .footer-links a:hover {
        color: #d7b28a;
        transform: translateX(-3px);
      }

      .footer-bottom {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        padding-top: 1.1rem;
        color: rgba(245, 239, 232, 0.52);
        font-size: 0.78rem;
      }

      @media (max-width: 720px) {
        .site-footer {
          padding-top: 2.5rem;
        }

        .footer-top {
          grid-template-columns: 1fr;
          gap: 1.75rem;
          text-align: center;
        }

        .eyebrow {
          justify-content: center;
        }

        .footer-logo {
          object-position: center;
        }

        .footer-brand,
        h3,
        .brand-note {
          margin-inline: auto;
        }

        .footer-links {
          justify-items: center;
          grid-template-columns: repeat(3, auto);
          justify-content: center;
          column-gap: 1.25rem;
          row-gap: 0.7rem;
        }

        .links-title {
          grid-column: 1 / -1;
        }

        .footer-bottom {
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 0.5rem;
        }
      }
    `,
  ],
})
export class FooterComponent {
  readonly store = inject(StoreService);

  whatsappUrl(): string {
    const digits = this.store.storeSettings().contact.whatsapp.replace(/\D/g, '');
    const number = digits.startsWith('0') ? `2${digits}` : digits;
    return `https://wa.me/${number || '201019465340'}`;
  }
}
