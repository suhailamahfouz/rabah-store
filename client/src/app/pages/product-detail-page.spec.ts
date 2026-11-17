import { ProductColor } from '../data/product-colors';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import { ProductDetailPageComponent } from './product-detail-page';
import { StoreService } from '../services/store.service';
import { ProductService } from '../services/product.service';

describe('ProductDetailPageComponent general inventory', () => {
  const params = new Subject<Record<string, string>>();
  let addToCartCall: unknown[] | undefined;
  const addToCart = (...args: unknown[]) => { addToCartCall = args; };
  const product = {
    id: 'product-1', slug: 'palette-product', name: { ar: 'منتج', en: 'Product' }, description: { ar: '', en: '' }, shortDescription: { ar: '', en: '' },
    price: 100, originalPrice: 120, rating: 5, reviewCount: 1, createdAt: '2026-01-01T00:00:00.000Z', stock: 3, category: 'bags',
    colorOptions: [] as ProductColor[],
    colors: ['#111111', '#eeeeee'], images: ['/first.jpg', '/second.jpg', '/third.jpg'], features: [],
    variants: [
      { id: 'black', color: { ar: 'أسود', en: 'Black' }, hex: '#111111', stock: 2 },
      { id: 'white', color: { ar: 'أبيض', en: 'White' }, hex: '#eeeeee', stock: 0 },
    ],
  };
  let currentProduct = product;

  beforeEach(() => {
    addToCartCall = undefined;
    currentProduct = product;
    TestBed.configureTestingModule({
      imports: [ProductDetailPageComponent],
      providers: [
        { provide: ProductService, useValue: { loadBySlug() {} } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ slug: 'palette-product' }) }, params } },
        { provide: StoreService, useValue: { lang: signal<'en' | 'ar'>('en'), currency: signal('EGP'), getProductBySlug: () => currentProduct, addToCart } },
      ],
    });
  });

  it('requires a chosen swatch and sends its identity to the cart', () => {
    currentProduct = { ...product, colorOptions: [{ hex: '#111111', name: { ar: 'Black', en: 'Black' } }, { hex: '#FFFFFF', name: { ar: 'White', en: 'White' } }] };
    const fixture = TestBed.createComponent(ProductDetailPageComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.canAddToCart()).toBe(false);
    const swatches = fixture.nativeElement.querySelectorAll('app-color-swatches button');
    swatches[1].click();
    fixture.detectChanges();
    expect(swatches[1].getAttribute('aria-pressed')).toBe('true');
    expect(fixture.componentInstance.canAddToCart()).toBe(true);
    fixture.componentInstance.addToCart();
    expect(addToCartCall).toEqual(['product-1', 1, '#FFFFFF']);
    fixture.nativeElement.querySelector('dialog').close = () => {};
    params.next({ slug: 'another-bag' });
    expect(fixture.componentInstance.selectedColor()).toBe('');
  });

  it('adds directly without a color choice and respects general stock', () => {
    const component = TestBed.createComponent(ProductDetailPageComponent).componentInstance;
    expect(component.canAddToCart()).toBe(true);
    component.incrementQty();
    component.incrementQty();
    component.incrementQty();
    expect(component.quantity()).toBe(3);
    expect(component.canAddToCart()).toBe(true);
    component.addToCart();
    expect(addToCartCall).toEqual(['product-1', 3]);
  });

  it('opens any thumbnail, navigates images and removes ratings', () => {
    const fixture = TestBed.createComponent(ProductDetailPageComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const dialog = element.querySelector('dialog')!;
    let opened = false;
    dialog.showModal = () => { opened = true; };
    dialog.close = () => { opened = false; };
    (element.querySelectorAll('.thumbs button')[2] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(opened).toBe(true);
    expect(element.querySelector('.main-image')?.getAttribute('src')).toBe('/third.jpg');
    expect(dialog.querySelector('img')?.getAttribute('src')).toBe('/third.jpg');
    fixture.componentInstance.stepImage(1);
    expect(fixture.componentInstance.selectedImage()).toBe(0);
    fixture.componentInstance.stepImage(-1);
    expect(fixture.componentInstance.selectedImage()).toBe(2);
    (element.querySelector('.viewer-close') as HTMLButtonElement).click();
    expect(opened).toBe(false);
    expect(element.querySelector('.rating-row')).toBeNull();
    expect(element.textContent).not.toContain('reviews');
  });

  it('explains zero stock and prevents purchasing unavailable products', () => {
    currentProduct = { ...product, stock: 0, variants: [] };
    const fixture = TestBed.createComponent(ProductDetailPageComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.primary-btn') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Out of stock');
    expect(fixture.nativeElement.querySelector('.purchase-status').textContent).toContain('currently out of stock');
    fixture.componentInstance.addToCart();
    expect(addToCartCall).toBeUndefined();
  });

  it('adds an in-stock product without colors through the actual button', () => {
    currentProduct = { ...product, stock: 3, variants: [] };
    const fixture = TestBed.createComponent(ProductDetailPageComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.primary-btn') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    button.click();
    expect(addToCartCall).toEqual(['product-1', 1]);
  });
});
