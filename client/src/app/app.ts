import { StorefrontIntroComponent } from './components/storefront-intro';
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { HeaderComponent } from './layout/header';
import { FooterComponent } from './layout/footer';
import { CartNotificationComponent } from './layout/cart-notification';
import { SeoService } from './services/seo.service';
import { StoreService } from './services/store.service';

@Component({
  imports: [StorefrontIntroComponent, CommonModule, RouterOutlet, HeaderComponent, FooterComponent, CartNotificationComponent],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  private readonly store = inject(StoreService);
  private readonly seo = inject(SeoService);
  private readonly currentUrl = signal(this.router.url || '/');

  readonly introVisible = signal(!location.pathname.startsWith('/admin'));

  constructor() {
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1250;
    const introTimer = setTimeout(() => this.introVisible.set(false), duration);
    inject(DestroyRef).onDestroy(() => clearTimeout(introTimer));
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe((event) => {
      const language = this.languageFromUrl(event.urlAfterRedirects);
      if (language && language !== this.store.lang()) this.store.applyLanguage(language);
      this.currentUrl.set(event.urlAfterRedirects);
    });

    effect(() => {
      const settings = this.store.storeSettings();
      this.seo.updateForRoute(this.currentUrl(), {
        language: this.store.lang(),
        storeName: settings.storeName,
        currency: settings.currency,
        products: this.store.products(),
        categories: this.store.categories(),
      });
    });
  }

  isAdminRoute(): boolean {
    return this.router.url.startsWith('/admin');
  }

  private languageFromUrl(url: string): 'ar' | 'en' | undefined {
    const language = new URL(url, 'https://rabah.local').searchParams.get('lang');
    return language === 'ar' || language === 'en' ? language : undefined;
  }
}
