import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { CartItem, Lang, Product } from '../models/store';
import { CategoryService } from './category.service';
import { ProductService } from './product.service';

interface PublicStoreSettings {
  storeName: string;
  logoUrl: string;
  hero?: { posterUrl: string };
  promoBanner?: { image: string; isActive: boolean };
  featuredCollection?: { image: string; link?: string };
  currency: string;
  deliveryFee: number;
  freeShippingThreshold?: number | null;
  announcement: { ar: string; en: string; isActive: boolean };
  contact: { phone: string; whatsapp: string; email: string };
  social: { instagram: string; facebook: string; tiktok: string };
  instapay: { enabled: boolean; identifier: string; accountName: string; instructions: { ar: string; en: string } };
  shipping?: { enabled: boolean; freeShipping: { enabled: boolean; threshold: number }; zones: Array<{ governorates: string[]; areas: string[]; isActive: boolean }> };
}

@Injectable({ providedIn: 'root' })
export class StoreService {
  private readonly http = inject(HttpClient);
  private readonly categoryService = inject(CategoryService);
  private readonly productService = inject(ProductService);
  readonly categories = this.categoryService.categories;
  readonly products = this.productService.products;
  readonly lang = signal<Lang>('ar');
  readonly catalogError = computed(() => {
    const errors = [this.categoryService.error(), this.productService.error()].filter(Boolean);
    if (!errors.length) return '';
    return this.lang() === 'ar'
      ? 'تعذر تحميل كتالوج المتجر من الخادم.'
      : 'Unable to load the store catalog from the server.';
  });
  readonly storeSettings = signal<PublicStoreSettings>({
    storeName: 'RABAH',
    logoUrl: '',
    hero: { posterUrl: '' },
    promoBanner: { image: '', isActive: false },
    featuredCollection: { image: '', link: '/catalog' },
    currency: 'EGP',
    // Shipping is quoted by the server after the customer supplies an address.
    // Do not use this initial browser state as a shipping-price fallback.
    deliveryFee: 0,
    freeShippingThreshold: undefined,
    announcement: { ar: '', en: '', isActive: false },
    contact: { phone: '', whatsapp: '', email: '' },
    social: { instagram: '', facebook: '', tiktok: '' },
    instapay: { enabled: false, identifier: '', accountName: '', instructions: { ar: '', en: '' } },
  });
  readonly settingsError = signal('');
  readonly cart = signal<CartItem[]>([]);
  readonly cartNotification = signal<{ id: number; productName: string } | null>(null);
  readonly wishlist = signal<string[]>([]);
  readonly currency = computed(() => {
    const currency = this.storeSettings().currency;
    return currency === 'EGP' && this.lang() === 'ar' ? 'ج.م.' : currency;
  });
  readonly announcementText = computed(() => {
    const settings = this.storeSettings();
    const customText = settings.announcement[this.lang()];
    if (settings.announcement.isActive && customText) return customText;
    const shipping = settings.shipping;
    if (!shipping?.enabled || !shipping.freeShipping?.enabled) return '';
    const threshold = shipping.freeShipping.threshold;
    if (!Number.isFinite(threshold) || threshold < 0) return '';
    if (threshold === 0) return this.lang() === 'ar' ? 'شحن مجاني على جميع الطلبات' : 'Free delivery on all orders';
    return this.lang() === 'ar'
      ? `شحن مجاني للطلبات من ${threshold} ${this.currency()}`
      : `Free delivery on orders of ${settings.currency} ${threshold} or more`;
  });

  /** Best Sellers are explicitly selected in the admin product form. */
  readonly featuredProducts = computed(() => this.products().filter((product) => product.isBestSeller).slice(0, 6));
  private notificationId = 0;
  private notificationTimeout?: ReturnType<typeof setTimeout>;

  constructor() {
    const urlLanguage = new URLSearchParams(globalThis.location?.search ?? '').get('lang');
    const savedLanguage = localStorage.getItem('rabah-lang') as Lang | null;
    const initialLanguage = urlLanguage === 'ar' || urlLanguage === 'en' ? urlLanguage : savedLanguage;
    if (initialLanguage === 'ar' || initialLanguage === 'en') {
      this.lang.set(initialLanguage);
    }

    // Reset the previous cart once; new shopping survives subsequent reloads.
    const cartResetVersion = '2026-11-16';
    if (localStorage.getItem('rabah-cart-reset-version') !== cartResetVersion) {
      localStorage.removeItem('rabah-cart');
      localStorage.setItem('rabah-cart-reset-version', cartResetVersion);
    }
    const savedCart = localStorage.getItem('rabah-cart');
    if (savedCart) {
      try {
        const savedItems = JSON.parse(savedCart) as unknown;
        if (Array.isArray(savedItems)) {
          this.cart.set(savedItems.flatMap((item) => {
            if (!item || typeof item !== 'object') return [];
            const value = item as { productId?: unknown; quantity?: unknown; color?: unknown; variantId?: unknown; note?: unknown };
            const quantity = Number(value.quantity);
            if (typeof value.productId !== 'string' || !Number.isInteger(quantity) || quantity <= 0) return [];
            return [{
              productId: value.productId,
              quantity,
              note: (typeof value.note === 'string' ? value.note : typeof value.color === 'string' ? value.color : '').slice(0, 500),
            }];
          }));
        }
      } catch {
        this.cart.set([]);
      }
    }

    const savedWishlist = localStorage.getItem('rabah-wishlist');
    if (savedWishlist) {
      try {
        const wishlist = JSON.parse(savedWishlist) as unknown;
        if (Array.isArray(wishlist) && wishlist.every((id) => typeof id === 'string')) {
          this.wishlist.set(wishlist);
        }
      } catch {
        this.wishlist.set([]);
      }
    }

    this.applyLanguage(this.lang());
    this.persistCart();
    this.productService.loadByIds(this.cart().map(item => item.productId));
    this.loadStoreSettings();
  }

  loadStoreSettings(): void {
    this.settingsError.set('');
    this.http.get<{ success: true; data: PublicStoreSettings }>('/api/store-settings', { headers: { 'Cache-Control': 'no-cache' } })
      .subscribe({
        next: ({ data }) => {
          this.storeSettings.set({
            ...data,
            hero: data.hero ?? { posterUrl: '' },
            promoBanner: data.promoBanner ?? { image: '', isActive: false },
            featuredCollection: data.featuredCollection ?? { image: '', link: '/catalog' },
            contact: data.contact ?? { phone: '', whatsapp: '', email: '' },
            social: data.social ?? { instagram: '', facebook: '', tiktok: '' },
            instapay: data.instapay ?? { enabled: false, identifier: '', accountName: '', instructions: { ar: '', en: '' } },
          });
          this.settingsError.set('');
        },
        error: () => this.settingsError.set(this.lang() === 'ar' ? 'تعذر تحميل إعدادات التوصيل.' : 'Unable to load shipping settings.'),
      });
  }

  reloadCatalog(): void {
    this.categoryService.reload();
    this.productService.reload();
  }

  applyLanguage(language: Lang): void {
    this.lang.set(language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('rabah-lang', language);
  }

  getProductBySlug(slug: string): Product | undefined {
    return this.productService.getBySlug(slug);
  }

  getProductById(productId: string): Product | undefined {
    return this.productService.getById(productId);
  }

  toggleWishlist(productId: string): void {
    const wishlist = this.wishlist();
    const product = this.getProductById(productId);
    const isWishlisted = this.isWishlisted(productId);
    const nextWishlist = isWishlisted
      ? wishlist.filter((id) => id !== productId && (!product || this.getProductById(id)?.slug !== product.slug))
      : [...wishlist, productId];
    this.wishlist.set(nextWishlist);
    localStorage.setItem('rabah-wishlist', JSON.stringify(nextWishlist));
  }

  isWishlisted(productId: string): boolean {
    const product = this.getProductById(productId);
    return this.wishlist().some(
      (id) => id === productId || (!!product && this.getProductById(id)?.slug === product.slug),
    );
  }

  addToCart(productId: string, quantity = 1, color?: string, variantId?: string): void {
    const nextItems = [...this.cart()];
    const product = this.getProductById(productId);
    if (!product || !Number.isFinite(product.stock) || product.stock <= 0 || !Number.isInteger(quantity) || quantity <= 0) return;
    const reserved = nextItems.filter(item => item.productId === product.id || this.getProductById(item.productId)?.slug === product.slug)
      .reduce((total, item) => total + item.quantity, 0);
    if (reserved + quantity > product.stock) return;
    const targetIndex = nextItems.findIndex((item) => {
      const sameProduct = item.productId === productId ||
        (!!product && this.getProductById(item.productId)?.slug === product.slug);
      return sameProduct && item.color === color && item.variantId === variantId;
    });

    if (targetIndex >= 0) {
      nextItems[targetIndex] = {
        ...nextItems[targetIndex],
        productId: product?.id ?? nextItems[targetIndex].productId,
        quantity: nextItems[targetIndex].quantity + quantity,
      };
    } else {
      nextItems.push({ productId, quantity, color, variantId });
    }

    this.cart.set(nextItems);
    this.persistCart();
    const notification = {
      id: ++this.notificationId,
      productName: this.getProductById(productId)?.name[this.lang()] ?? '',
    };
    this.cartNotification.set(notification);
    if (this.notificationTimeout) clearTimeout(this.notificationTimeout);
    this.notificationTimeout = setTimeout(() => {
      if (this.cartNotification()?.id === notification.id) {
        this.cartNotification.set(null);
      }
    }, 2800);
  }

  updateQuantity(productId: string, quantity: number, color?: string, variantId?: string): void {
    const product = this.getProductById(productId);
    const nextItems = this.cart()
      .map((item) => {
        const sameProduct = item.productId === productId ||
          (!!product && this.getProductById(item.productId)?.slug === product.slug);
        const matches = sameProduct && item.color === color && item.variantId === variantId;
        if (!matches) {
          return item;
        }

        return { ...item, quantity: Math.max(0, quantity) };
      })
      .filter((item) => item.quantity > 0);

    this.cart.set(nextItems);
    this.persistCart();
  }

  removeFromCart(productId: string, color?: string, variantId?: string): void {
    const product = this.getProductById(productId);
    this.cart.set(
      this.cart().filter(
        (item) => {
          const sameProduct = item.productId === productId ||
            (!!product && this.getProductById(item.productId)?.slug === product.slug);
          return !(sameProduct && item.color === color && item.variantId === variantId);
        },
      ),
    );
    this.persistCart();
  }

  clearCart(): void {
    this.cart.set([]);
    this.persistCart();
  }

  updateItemNote(productId: string, note: string, index?: number): void {
    this.cart.update(items => items.map((item, i) =>
      item.productId === productId && (index === undefined || i === index)
        ? { ...item, note: note.slice(0, 500) } : item));
    this.persistCart();
  }

  get cartCount(): number {
    return this.cart().reduce((sum, item) => sum + item.quantity, 0);
  }

  get subtotal(): number {
    return this.cart().reduce((sum, item) => {
      const product = this.getProductById(item.productId);
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);
  }

  private persistCart(): void {
    localStorage.setItem('rabah-cart', JSON.stringify(this.cart()));
  }
}
