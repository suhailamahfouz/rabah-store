import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { StoreService } from '../services/store.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <header class="site-header">
      <div class="top-bar">
        <div
          class="announcement"
          [attr.aria-label]="store.announcementText()"
          *ngIf="store.announcementText() && !store.settingsError() && !store.catalogError()"
        >
          <div class="announcement-track" aria-hidden="true">
            <span class="announcement-group">
              <span *ngFor="let item of [1, 2, 3]">{{ store.announcementText() }}</span>
            </span>
            <span class="announcement-group" aria-hidden="true">
              <span *ngFor="let item of [1, 2, 3]">{{ store.announcementText() }}</span>
            </span>
          </div>
        </div>
        <p
          class="settings-error"
          *ngIf="store.settingsError() || store.catalogError()"
          role="status"
        >
          {{ store.settingsError() || store.catalogError() }}
          <button
            *ngIf="store.settingsError()"
            type="button"
            class="lang-switch"
            (click)="store.loadStoreSettings()"
          >
            {{ store.lang() === 'ar' ? 'إعادة المحاولة' : 'Try again' }}
          </button>
        </p>
        <div class="top-actions">
          <button type="button" class="lang-switch" (click)="toggleLanguage()">
            {{ store.lang() === 'ar' ? 'EN' : 'AR' }}
          </button>
        </div>
      </div>

      <nav class="main-nav container" aria-label="Main navigation">
        <button
          type="button"
          class="menu-toggle"
          [attr.aria-label]="store.lang() === 'ar' ? 'افتحي القائمة' : 'Open menu'"
          [attr.aria-expanded]="menuOpen"
          aria-controls="side-menu"
          (click)="toggleMenu()"
        >
          <span></span>
          <span></span>
        </button>

        <a routerLink="/" class="brand" aria-label="RABAH home">
          <img
            [src]="store.storeSettings().logoUrl || '/logo-plat.png'"
            [alt]="store.storeSettings().storeName"
          />
        </a>

        <div class="nav-links">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">{{
            store.lang() === 'ar' ? 'الرئيسية' : 'Home'
          }}</a>
          <a routerLink="/catalog" routerLinkActive="active">{{
            store.lang() === 'ar' ? 'المتجر' : 'Catalog'
          }}</a>
          <ng-container *ngIf="auth.user() as user; else guestLinks">
            <span class="user-greeting">{{ user.name }}</span>
            <a routerLink="/account/orders" routerLinkActive="active">{{
              store.lang() === 'ar' ? 'طلباتي' : 'My orders'
            }}</a>
            <button type="button" class="logout-link" (click)="logout()">
              {{ store.lang() === 'ar' ? 'تسجيل الخروج' : 'Log out' }}
            </button>
          </ng-container>
          <ng-template #guestLinks>
            <a routerLink="/login" routerLinkActive="active">{{
              store.lang() === 'ar' ? 'تسجيل الدخول' : 'Login'
            }}</a>
            <a routerLink="/login" [queryParams]="{ register: true }">{{
              store.lang() === 'ar' ? 'إنشاء حساب' : 'Register'
            }}</a>
          </ng-template>
        </div>

        <div class="nav-tools">
          <button type="button" class="icon-button" aria-label="Search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="10.8" cy="10.8" r="6.3"></circle>
              <path d="m15.4 15.4 4.1 4.1"></path>
            </svg>
          </button>
          <a routerLink="/cart" class="cart-button" aria-label="Cart">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 8h14l1 12H4L5 8Z"></path>
              <path d="M9 9V6a3 3 0 0 1 6 0v3"></path>
            </svg>
            <span class="cart-count">{{ cartCount() }}</span>
          </a>
        </div>
      </nav>

      <ng-container *ngIf="menuOpen">
        <button
          type="button"
          class="drawer-backdrop"
          [attr.aria-label]="store.lang() === 'ar' ? 'إغلاق القائمة' : 'Close menu'"
          (click)="closeMenu()"
        ></button>
        <aside
          id="side-menu"
          class="side-drawer"
          [attr.dir]="store.lang()"
          [attr.aria-label]="store.lang() === 'ar' ? 'قائمة التنقل' : 'Navigation menu'"
          (keydown.escape)="closeMenu()"
        >
          <div class="drawer-heading">
            <a routerLink="/" class="drawer-brand" aria-label="RABAH home" (click)="closeMenu()">
              <img
                [src]="store.storeSettings().logoUrl || '/logo-plat.png'"
                [alt]="store.storeSettings().storeName"
              />
            </a>
            <button
              type="button"
              class="drawer-close"
              (click)="closeMenu()"
              [attr.aria-label]="store.lang() === 'ar' ? 'إغلاق' : 'Close'"
            >
              ×
            </button>
          </div>
          <nav
            class="drawer-links"
            [attr.aria-label]="store.lang() === 'ar' ? 'روابط الموقع' : 'Site links'"
          >
            <a
              routerLink="/"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: true }"
              (click)="closeMenu()"
              >{{ store.lang() === 'ar' ? 'الرئيسية' : 'Home' }}<span>01</span></a
            >
            <a routerLink="/catalog" routerLinkActive="active" (click)="closeMenu()"
              >{{ store.lang() === 'ar' ? 'التصنيفات' : 'Categories' }}<span>02</span></a
            >
            <ng-container *ngIf="auth.user() as user; else mobileGuestLinks">
              <a routerLink="/account/orders" routerLinkActive="active" (click)="closeMenu()"
                >{{ store.lang() === 'ar' ? 'طلباتي' : 'My orders' }}<span>03</span></a
              >
              <button type="button" class="drawer-action" (click)="logout()">
                {{ user.name }} · {{ store.lang() === 'ar' ? 'تسجيل الخروج' : 'Log out'
                }}<span>04</span>
              </button>
            </ng-container>
            <ng-template #mobileGuestLinks>
              <a routerLink="/login" routerLinkActive="active" (click)="closeMenu()"
                >{{ store.lang() === 'ar' ? 'تسجيل الدخول' : 'Sign in' }}<span>03</span></a
              >
              <a routerLink="/login" [queryParams]="{ register: true }" (click)="closeMenu()"
                >{{ store.lang() === 'ar' ? 'إنشاء حساب' : 'Register' }}<span>04</span></a
              >
            </ng-template>
            <a routerLink="/cart" routerLinkActive="active" (click)="closeMenu()"
              >{{ store.lang() === 'ar' ? 'سلة التسوق' : 'Shopping bag'
              }}<span>{{ cartCount() }}</span></a
            >
          </nav>
          <p class="drawer-note" *ngIf="store.announcementText()">{{ store.announcementText() }}</p>
        </aside>
      </ng-container>
    </header>
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

      .site-header {
        position: sticky;
        top: 0;
        z-index: 20;
        background: rgba(255, 253, 249, 0.98);
        border-bottom: 1px solid rgba(84, 33, 44, 0.1);
        box-shadow: 0 1px 14px rgba(44, 31, 25, 0.04);
      }

      .top-bar {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 31px;
        overflow: hidden;
        padding: 0.3rem 4rem;
        background: #54212c;
        color: #f7f3ed;
        font-size: 0.65rem;
        letter-spacing: 0.06em;
      }

      .announcement {
        width: min(390px, 72vw);
        overflow: hidden;
        white-space: nowrap;
      }

      .settings-error {
        margin: 0;
        color: #f7f3ed;
      }

      .announcement-track,
      .announcement-group {
        display: flex;
        width: max-content;
      }

      .announcement-track {
        animation: announcement-scroll 24s linear infinite;
      }

      .announcement-group {
        flex: 0 0 auto;
        align-items: center;
        gap: 2rem;
        padding-inline-end: 2rem;
      }

      .announcement-group span {
        display: inline-flex;
        align-items: center;
        gap: 2rem;
      }

      .announcement-group span::after {
        width: 5px;
        height: 5px;
        flex: 0 0 auto;
        background: #d7bc8c;
        content: '';
        transform: rotate(45deg);
      }

      @keyframes announcement-scroll {
        to {
          transform: translateX(-50%);
        }
      }

      .hero-overlay .top-bar {
        background: rgba(31, 23, 23, 0.23);
        border-bottom: 1px solid rgba(247, 243, 237, 0.2);
      }

      .top-actions {
        position: absolute;
        right: max(1.5rem, calc((100% - 1200px) / 2));
        top: 50%;
        transform: translateY(-50%);
      }

      .lang-switch {
        border: 0;
        background: transparent;
        color: inherit;
        padding: 0.2rem;
        cursor: pointer;
        font-size: 0.65rem;
        letter-spacing: 0.08em;
      }

      .main-nav {
        position: relative;
        width: min(1200px, calc(100% - 3rem));
        margin: 0 auto;
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        min-height: 78px;
        gap: 1rem;
      }

      .brand {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        position: static;
        grid-column: 2;
        text-decoration: none;
      }

      .brand img {
        display: block;
        width: 62px;
        height: 62px;
        object-fit: contain;
      }

      .nav-links {
        display: flex;
        grid-column: 1;
        align-items: center;
        justify-self: start;
        gap: 1.55rem;
      }

      .menu-toggle {
        display: none;
        width: 46px;
        height: 46px;
        flex-direction: column;
        align-items: flex-start;
        justify-content: center;
        gap: 7px;
        border: 0;
        background: transparent;
        color: #453b37;
        cursor: pointer;
      }

      .menu-toggle span {
        width: 27px;
        height: 2px;
        background: currentColor;
      }

      .nav-links a,
      .nav-tools a {
        position: relative;
        color: #453b37;
        text-decoration: none;
        font-size: 0.7rem;
        font-weight: 600;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .nav-links a.active {
        color: #96794f;
      }

      .nav-links a::after {
        position: absolute;
        right: 0;
        bottom: -0.65rem;
        left: 0;
        height: 1px;
        background: currentColor;
        content: '';
        opacity: 0;
        transform: scaleX(0);
        transition:
          opacity 160ms ease,
          transform 160ms ease;
      }

      .nav-links a:hover::after,
      .nav-links a.active::after {
        opacity: 1;
        transform: scaleX(1);
      }

      .user-greeting {
        color: #8d573c;
        font-size: 0.68rem;
        font-weight: 700;
      }
      .logout-link {
        border: 0;
        padding: 0;
        background: transparent;
        color: #641b2e;
        font: inherit;
        font-size: 0.68rem;
        cursor: pointer;
      }

      .hero-overlay .nav-links a,
      .hero-overlay .nav-tools a {
        color: #f7f3ed;
      }

      .hero-overlay .nav-links a.active {
        color: #ddc28f;
      }

      .nav-tools {
        display: flex;
        grid-column: 3;
        align-items: center;
        justify-content: flex-end;
        justify-self: end;
        gap: 0.9rem;
      }

      .cart-button {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.4rem 0.2rem;
      }

      .cart-button > svg,
      .icon-button svg {
        display: block;
        width: 1.35rem;
        height: 1.35rem;
        fill: none;
        stroke: currentColor;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 1.6;
      }

      .icon-button {
        display: grid;
        place-items: center;
        padding: 0.2rem;
        border: 0;
        background: transparent;
        color: inherit;
        cursor: pointer;
      }

      .cart-count {
        min-width: 1.55rem;
        height: 1.55rem;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: #54212c;
        color: #fff;
        font-size: 0.72rem;
      }

      .hero-overlay .cart-count {
        background: rgba(247, 243, 237, 0.2);
        color: #fff;
      }

      .drawer-backdrop {
        position: fixed;
        z-index: 40;
        inset: 0;
        width: 100%;
        height: 100%;
        border: 0;
        background: rgba(25, 19, 19, 0.48);
        cursor: pointer;
        animation: backdrop-in 180ms ease both;
      }

      .side-drawer {
        position: fixed;
        z-index: 41;
        inset-block: 0;
        inset-inline-start: 0;
        display: flex;
        width: min(390px, 88vw);
        flex-direction: column;
        padding: 1.5rem;
        background: #f7f3ed;
        color: #54212c;
        box-shadow: 0 0 60px rgba(20, 10, 10, 0.16);
        animation: drawer-in 260ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
      }

      .drawer-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: 1.5rem;
        border-bottom: 1px solid rgba(84, 33, 44, 0.16);
      }

      .drawer-brand {
        display: inline-flex;
        text-decoration: none;
      }

      .drawer-brand img {
        display: block;
        width: 62px;
        height: 62px;
        object-fit: contain;
      }

      .drawer-close {
        width: 40px;
        height: 40px;
        border: 1px solid rgba(84, 33, 44, 0.2);
        border-radius: 50%;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font-size: 1.6rem;
        line-height: 1;
      }

      .drawer-links {
        display: grid;
        margin-top: 1rem;
      }

      .drawer-links a {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 1.1rem 0;
        border-bottom: 1px solid rgba(84, 33, 44, 0.12);
        color: inherit;
        font-family: Georgia, 'Times New Roman', serif;
        font-size: 1.25rem;
        text-decoration: none;
      }

      .drawer-links a.active {
        color: #a18355;
      }

      .drawer-links a span {
        color: #9d9186;
        font-family: 'Segoe UI', Tahoma, sans-serif;
        font-size: 0.65rem;
        letter-spacing: 0.1em;
      }

      .drawer-action {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 1.1rem 0;
        border: 0;
        border-bottom: 1px solid rgba(84, 33, 44, 0.12);
        background: transparent;
        color: inherit;
        font: inherit;
        font-family: Georgia, 'Times New Roman', serif;
        font-size: 1.25rem;
        text-align: inherit;
        cursor: pointer;
      }

      .drawer-note {
        margin: auto 0 0;
        padding-top: 1.2rem;
        border-top: 1px solid rgba(84, 33, 44, 0.16);
        color: #806b56;
        font-size: 0.8rem;
        letter-spacing: 0.04em;
      }

      @keyframes drawer-in {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes backdrop-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @media (max-width: 720px) {
        .top-bar {
          min-height: 29px;
          font-size: 0.6rem;
        }

        .top-actions {
          right: 1rem;
        }

        .main-nav {
          display: grid;
          grid-template-columns: 46px 1fr 46px;
          width: min(100% - 1.5rem, 640px);
          min-height: 68px;
          gap: 0;
        }

        .nav-links {
          display: none;
        }

        .menu-toggle {
          display: flex;
          grid-column: 1;
        }

        .nav-tools a {
          font-size: 0.59rem;
          letter-spacing: 0.06em;
        }

        .brand img {
          width: 54px;
          height: 54px;
        }

        .brand {
          grid-column: 2;
          justify-self: center;
        }

        .icon-button {
          display: none;
        }

        .nav-tools {
          grid-column: 3;
          justify-self: end;
        }
      }

      @media (max-width: 420px) {
        .nav-tools a {
          font-size: 0.54rem;
        }

        .cart-button {
          gap: 0.25rem;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .announcement-track {
          animation: none;
        }

        .drawer-backdrop,
        .side-drawer {
          animation-duration: 1ms;
        }
      }
    `,
  ],
})
export class HeaderComponent {
  readonly store = inject(StoreService);
  readonly auth = inject(AuthService);
  readonly cartCount = computed(() => this.store.cartCount);
  private readonly router = inject(Router);
  menuOpen = false;

  isHome(): boolean {
    return this.router.url.split('?')[0] === '/';
  }

  toggleLanguage(): void {
    const language = this.store.lang() === 'ar' ? 'en' : 'ar';
    const url = this.router.parseUrl(this.router.url);
    url.queryParams = { ...url.queryParams, lang: language };
    this.store.applyLanguage(language);
    void this.router.navigateByUrl(url);
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => {
        this.closeMenu();
        void this.router.navigate(['/login']);
      },
      error: () => {
        this.closeMenu();
        void this.router.navigate(['/login']);
      },
    });
  }
}
