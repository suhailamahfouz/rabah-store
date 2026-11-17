import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Category, Lang, Product } from '../models/store';

interface SeoRouteContext {
  language: Lang;
  storeName: string;
  currency: string;
  products: Product[];
  categories: Category[];
}

interface SeoPage {
  title: string;
  description: string;
  canonicalPath: string;
  image?: string;
  imageAlt?: string;
  type?: 'website' | 'product';
  indexable: boolean;
  structuredData?: Record<string, unknown>;
}

/**
 * Owns the document-level SEO tags for this client-rendered storefront.
 * Language is deliberately part of the canonical URL so the Arabic and English
 * versions are independently discoverable (`?lang=ar` and `?lang=en`).
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);

  updateForRoute(currentUrl: string, context: SeoRouteContext): void {
    const parsedUrl = new URL(currentUrl, 'https://rabah.local');
    const path = parsedUrl.pathname.replace(/\/+$/, '') || '/';
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
    const productSlug = parts[0] === 'product' ? parts[1] : undefined;
    const categorySlug = parts[0] === 'catalog'
      ? (parts[1] || parsedUrl.searchParams.get('category') || undefined)
      : undefined;
    const category = categorySlug
      ? context.categories.find((item) => item.slug === categorySlug)
      : undefined;
    const product = productSlug
      ? context.products.find((item) => item.slug === productSlug)
      : undefined;

    let page: SeoPage;
    if (productSlug) {
      page = product
        ? this.productPage(product, context)
        : this.notFoundPage(`/product/${encodeURIComponent(productSlug)}`, context);
    } else if (parts[0] === 'catalog' && categorySlug) {
      page = category
        ? this.categoryPage(category, context)
        : this.notFoundPage(`/catalog/${encodeURIComponent(categorySlug)}`, context);
    } else if (parts[0] === 'catalog') {
      page = this.catalogPage(context);
    } else if (path === '/') {
      page = this.homePage(context);
    } else {
      page = this.privateOrUtilityPage(path, context);
    }

    // Search, sort, price, and colour views are useful for shoppers but should
    // not create duplicate indexed catalog pages. Category landing pages have
    // their own clean, indexable canonical URLs above.
    const hasCatalogFilters = parts[0] === 'catalog' && [...parsedUrl.searchParams.keys()]
      .some((key) => key !== 'lang');
    if (hasCatalogFilters) {
      page = { ...page, indexable: false };
    }

    this.apply(page, context);
  }

  private homePage(context: SeoRouteContext): SeoPage {
    const isArabic = context.language === 'ar';
    const storeName = this.storeName(context.storeName);
    return {
      title: isArabic ? `${storeName} | أناقة مختارة لكل يوم` : `${storeName} | Everyday elegance, thoughtfully chosen`,
      description: isArabic
        ? 'اكتشف تشكيلة RABAH المختارة من الإكسسوارات والهدايا والقطع الأنيقة لكل يوم.'
        : 'Discover RABAH’s thoughtfully chosen accessories, gifts, and elegant everyday essentials.',
      canonicalPath: '/',
      image: '/logo-gold.png',
      imageAlt: storeName,
      type: 'website',
      indexable: true,
    };
  }

  private catalogPage(context: SeoRouteContext): SeoPage {
    const isArabic = context.language === 'ar';
    const storeName = this.storeName(context.storeName);
    return {
      title: isArabic ? `تسوق المجموعة | ${storeName}` : `Shop the collection | ${storeName}`,
      description: isArabic
        ? `تصفح أحدث منتجات ${storeName} المختارة بعناية.`
        : `Browse the latest thoughtfully selected products from ${storeName}.`,
      canonicalPath: '/catalog',
      image: '/logo-gold.png',
      imageAlt: storeName,
      type: 'website',
      indexable: true,
    };
  }

  private categoryPage(category: Category, context: SeoRouteContext): SeoPage {
    const language = context.language;
    const storeName = this.storeName(context.storeName);
    const name = this.localized(category.label, language);
    const description = this.localized(category.description, language)
      || (language === 'ar'
        ? `تسوق تشكيلة ${name} المختارة من ${storeName}.`
        : `Shop the curated ${name} collection from ${storeName}.`);
    return {
      title: language === 'ar' ? `${name} | ${storeName}` : `${name} | ${storeName}`,
      description,
      canonicalPath: `/catalog/${encodeURIComponent(category.slug)}`,
      image: category.image || '/logo-gold.png',
      imageAlt: name,
      type: 'website',
      indexable: true,
    };
  }

  private productPage(product: Product, context: SeoRouteContext): SeoPage {
    const language = context.language;
    const storeName = this.storeName(context.storeName);
    const name = this.localized(product.name, language);
    const description = this.localized(product.shortDescription, language)
      || this.localized(product.description, language)
      || (language === 'ar' ? `تسوق ${name} من ${storeName}.` : `Shop ${name} from ${storeName}.`);
    const canonicalPath = `/product/${encodeURIComponent(product.slug)}`;
    const image = product.images.find(Boolean) || '/logo-gold.png';
    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name,
      description: this.cleanText(description, 5000),
      sku: product.sku || product.slug,
      image: product.images.filter(Boolean).map((item) => this.absoluteUrl(item)),
      url: this.absoluteUrl(this.localizedPath(canonicalPath, language)),
      brand: { '@type': 'Brand', name: storeName },
      offers: {
        '@type': 'Offer',
        url: this.absoluteUrl(this.localizedPath(canonicalPath, language)),
        priceCurrency: context.currency || 'EGP',
        price: product.price,
        availability: product.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
      },
    };

    return {
      title: `${name} | ${storeName}`,
      description,
      canonicalPath,
      image,
      imageAlt: name,
      type: 'product',
      indexable: true,
      structuredData: schema,
    };
  }

  private privateOrUtilityPage(path: string, context: SeoRouteContext): SeoPage {
    const storeName = this.storeName(context.storeName);
    const isArabic = context.language === 'ar';
    return {
      title: isArabic ? `${storeName} | المتجر` : `${storeName} | Store`,
      description: isArabic ? `تسوق أحدث اختيارات ${storeName}.` : `Shop the latest selections from ${storeName}.`,
      canonicalPath: path,
      image: '/logo-gold.png',
      imageAlt: storeName,
      type: 'website',
      // Checkout, accounts, admin, and any unmatched utility route must not
      // compete with the public catalog in search results.
      indexable: false,
    };
  }

  private notFoundPage(path: string, context: SeoRouteContext): SeoPage {
    const storeName = this.storeName(context.storeName);
    return {
      title: `${storeName} | Store`,
      description: context.language === 'ar' ? `اكتشف منتجات ${storeName}.` : `Discover products from ${storeName}.`,
      canonicalPath: path,
      image: '/logo-gold.png',
      imageAlt: storeName,
      type: 'website',
      indexable: false,
    };
  }

  private apply(page: SeoPage, context: SeoRouteContext): void {
    const language = context.language;
    const description = this.cleanText(page.description, 160);
    const canonical = this.absoluteUrl(this.localizedPath(page.canonicalPath, language));
    const image = this.absoluteUrl(page.image || '/logo-gold.png');
    const locale = language === 'ar' ? 'ar_EG' : 'en_US';
    const alternateLocale = language === 'ar' ? 'en_US' : 'ar_EG';

    this.document.documentElement.lang = language;
    this.document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    this.title.setTitle(this.cleanText(page.title, 120));
    this.setMeta('name', 'description', description);
    this.setMeta('name', 'robots', page.indexable ? 'index, follow, max-image-preview:large' : 'noindex, nofollow');
    this.setMeta('property', 'og:title', this.cleanText(page.title, 120));
    this.setMeta('property', 'og:description', description);
    this.setMeta('property', 'og:type', page.type || 'website');
    this.setMeta('property', 'og:url', canonical);
    this.setMeta('property', 'og:image', image);
    this.setMeta('property', 'og:image:alt', page.imageAlt || this.storeName(context.storeName));
    this.setMeta('property', 'og:site_name', this.storeName(context.storeName));
    this.setMeta('property', 'og:locale', locale);
    this.setMeta('property', 'og:locale:alternate', alternateLocale);
    this.setMeta('name', 'twitter:card', 'summary_large_image');
    this.setMeta('name', 'twitter:title', this.cleanText(page.title, 120));
    this.setMeta('name', 'twitter:description', description);
    this.setMeta('name', 'twitter:image', image);
    this.setLink('canonical', { rel: 'canonical', href: canonical });
    this.setLink('alternate-ar', {
      rel: 'alternate', hreflang: 'ar', href: this.absoluteUrl(this.localizedPath(page.canonicalPath, 'ar')),
    });
    this.setLink('alternate-en', {
      rel: 'alternate', hreflang: 'en', href: this.absoluteUrl(this.localizedPath(page.canonicalPath, 'en')),
    });
    this.setLink('alternate-default', {
      rel: 'alternate', hreflang: 'x-default', href: this.absoluteUrl(this.localizedPath(page.canonicalPath, 'ar')),
    });
    this.setStructuredData(page.structuredData);
  }

  private setMeta(attribute: 'name' | 'property', key: string, content: string): void {
    let element = this.document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
    if (!element) {
      element = this.document.createElement('meta');
      element.setAttribute(attribute, key);
      this.document.head.appendChild(element);
    }
    element.content = content;
  }

  private setLink(key: string, attributes: Record<string, string>): void {
    let element = this.document.head.querySelector<HTMLLinkElement>(`link[data-rabah-seo="${key}"]`);
    if (!element && key === 'canonical') {
      element = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    }
    if (!element) {
      element = this.document.createElement('link');
      this.document.head.appendChild(element);
    }
    element.dataset['rabahSeo'] = key;
    Object.entries(attributes).forEach(([name, value]) => element!.setAttribute(name, value));
  }

  private setStructuredData(data: Record<string, unknown> | undefined): void {
    const id = 'rabah-structured-data';
    const existing = this.document.getElementById(id);
    if (!data) {
      existing?.remove();
      return;
    }
    const script = existing ?? this.document.createElement('script');
    script.id = id;
    script.setAttribute('type', 'application/ld+json');
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
    if (!existing) this.document.head.appendChild(script);
  }

  private localized(value: { ar: string; en: string }, language: Lang): string {
    return value[language] || value.ar || value.en || '';
  }

  private localizedPath(path: string, language: Lang): string {
    const url = new URL(path, 'https://rabah.local');
    url.searchParams.set('lang', language);
    return `${url.pathname}${url.search}`;
  }

  private absoluteUrl(path: string): string {
    try {
      return new URL(path, this.document.location?.origin || 'http://localhost').toString();
    } catch {
      return path;
    }
  }

  private cleanText(value: string, maxLength: number): string {
    const text = value.replace(/\s+/g, ' ').trim();
    return text.length <= maxLength ? text : `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
  }

  private storeName(value: string): string {
    return this.cleanText(value || 'RABAH', 80);
  }
}
