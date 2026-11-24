import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { StoreService } from '../services/store.service';
import { ProductService } from '../services/product.service';
import { CheckoutPageComponent } from './checkout-page';

describe('CheckoutPageComponent', () => {
  let harness: RouterTestingHarness;
  let component: CheckoutPageComponent;
  let http: HttpTestingController;
  let store: StoreService;

  beforeEach(async () => {
    localStorage.removeItem('rabah-cart');
    sessionStorage.removeItem('rabah-pending-proof-v1');
    await TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    harness = await RouterTestingHarness.create();
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(StoreService);
    http.expectOne('/api/categories').error(new ProgressEvent('Network error'));
    TestBed.inject(ProductService).loadCatalog();
    http.expectOne('/api/products?limit=24&page=1').flush({
      success: true,
      data: [{
        id: 'product-id',
        slug: 'taif-velvet-tote',
        name: { ar: 'حقيبة تايف', en: 'Taif Tote' },
        description: { ar: 'وصف', en: 'Description' },
        shortDescription: { ar: 'وصف مختصر', en: 'Short description' },
        price: 349,
        originalPrice: 429,
        rating: 4.8,
        reviewCount: 12,
        createdAt: '2026-03-01T00:00:00.000Z',
        stock: 5,
        category: 'bags',
        colors: [],
        variants: [],
        images: [],
        features: [],
      }],
      meta: { total: 1, limit: 24, page: 1 },
    });
    http.expectOne('/api/store-settings').flush({
      success: true,
      data: {
        storeName: 'RABAH',
        logoUrl: '',
        currency: 'EGP',
        shipping: { enabled: true, zones: [
          { governorates: ['Cairo'], areas: ['Cairo', 'Maadi'], isActive: true },
          { governorates: ['Giza'], areas: ['Dokki'], isActive: true },
          { governorates: ['Alexandria'], areas: [], isActive: true },
          { governorates: ['Hidden'], areas: ['Hidden area'], isActive: false },
        ] },
        deliveryFee: 25,
        freeShippingThreshold: 1000,
        announcement: { ar: '', en: '', isActive: false },
      },
    });
    store.addToCart('product-id', 2);
    store.updateItemNote('product-id', 'تغليف هدية');
    component = await harness.navigateByUrl('/checkout', CheckoutPageComponent);
    component.form.setValue({
      name: 'Rabah Customer',
      phone: '01012345678',
      governorate: 'Cairo',
      city: 'Cairo',
      address: '12 Nile Street',
    });
    http.expectOne('/api/orders/shipping-quote').flush({
      success: true,
      data: { fee: 25, isFree: false },
    });
  });

  afterEach(() => http.verify());

  it('uses admin locations and clears the previous area on governorate changes', () => {
    expect(component.shippingGovernorates()).toEqual(['Cairo', 'Giza', 'Alexandria']);
    expect(component.shippingAreas()).toEqual(['Cairo', 'Maadi']);
    component.form.controls.governorate.setValue('Giza');
    expect(component.form.controls.city.value).toBe('');
    expect(component.shippingAreas()).toEqual(['Dokki']);
    expect(component.shippingSelectionValid()).toBe(false);
    component.form.controls.city.setValue('Maadi');
    component.submit();
    http.expectNone('/api/orders');
    http.expectNone('/api/orders/shipping-quote');
  });

  it('ignores an outdated shipping quote and waits for the selected area quote', () => {
    component.form.controls.city.setValue('Maadi');
    const previous = http.expectOne('/api/orders/shipping-quote');
    component.form.controls.governorate.setValue('Giza');
    expect(previous.cancelled).toBe(true);
    component.form.controls.city.setValue('Dokki');
    const current = http.expectOne('/api/orders/shipping-quote');
    component.submit();
    http.expectNone('/api/orders');
    current.flush({ success: true, data: { fee: 40 } });
    expect(component.shippingFee()).toBe(40);
    expect(component.shippingLoading()).toBe(false);
  });

  it('supports zones covering a whole governorate without inventing area names', () => {
    component.form.controls.governorate.setValue('Alexandria');
    expect(component.shippingAreas()).toEqual([]);
    expect(component.coversWholeGovernorate()).toBe(true);
    component.form.controls.city.setValue('Alexandria');
    http.expectOne('/api/orders/shipping-quote').flush({ success: true, data: { fee: 50 } });
    expect(component.shippingSelectionValid()).toBe(true);
  });

  it('renders dropdowns and Arabic labels alongside English checkout labels', () => {
    store.applyLanguage('en');
    harness.detectChanges();
    const element = harness.routeNativeElement!;
    expect(element.querySelectorAll('select')).toHaveLength(2);
    expect(element.querySelector('datalist')).toBeNull();
    expect(element.textContent).toContain('Full name — الاسم الكامل');
    expect(element.textContent).toContain('Phone number — رقم الهاتف');
    expect(element.textContent).toContain('Detailed address — العنوان بالتفصيل');
    expect(element.textContent).toContain('Place order — تأكيد الطلب');
  });

  it('creates a COD order and displays the returned order number', () => {
    component.submit();

    const request = http.expectOne('/api/orders');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('X-Requested-With')).toBe('XMLHttpRequest');
    expect(request.request.body.paymentMethod).toBe('cod');
    expect(request.request.body.items).toEqual([
      { productSlug: 'taif-velvet-tote', quantity: 2, note: 'تغليف هدية' },
    ]);

    request.flush({
      success: true,
      data: {
        id: 'order-id',
        orderNumber: 'RBAH-2026-00042',
        status: 'new',
        paymentStatus: 'pending',
        paymentMethod: 'cod',
        currency: 'EGP',
        subtotal: 698,
        shippingFee: 25,
        total: 723,
        createdAt: '2026-11-13T00:00:00.000Z',
      },
    });
    harness.detectChanges();

    expect(component.orderSubmitted()).toBe(true);
    expect(store.cart()).toEqual([]);
    expect(harness.routeNativeElement?.textContent).toContain('RBAH-2026-00042');
    expect(harness.routeNativeElement?.textContent).not.toContain('InstaPay');
    expect(harness.routeNativeElement?.textContent).not.toContain('إنستا باي');
  });

  it('sends the selected color with the order item', () => {
    store.applyLanguage('ar');
    TestBed.inject(ProductService).products.update(products => products.map(product => ({ ...product, colorOptions: [{ hex: '#111111', name: { ar: 'أسود', en: 'Black' } }] })));
    store.clearCart();
    store.addToCart('product-id', 1, '#111111');
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('أسود');
    component.submit();
    const request = http.expectOne('/api/orders');
    expect(request.request.body.items[0].color).toBe('#111111');
    request.flush({ error: { message: 'test response' } }, { status: 400, statusText: 'Test' });
  });

  it('keeps the cart and surfaces an error when the API rejects an order', () => {
    component.submit();

    http
      .expectOne('/api/orders')
      .flush(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Product not found' } },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(component.orderSubmitted()).toBe(false);
    expect(component.errorMessage()).toBe('Product not found');
    expect(store.cart()).toHaveLength(1);
  });

  it('uploads an InstaPay proof with the order capability rather than the idempotency key', () => {
    store.storeSettings.update((settings) => ({
      ...settings,
      instapay: { enabled: true, identifier: 'account', accountName: '', instructions: { ar: '', en: '' } },
    }));
    component.selectedPaymentMethod.set('instapay');
    component.submit();
    http.expectOne('/api/orders').flush({
      success: true,
      data: {
        id: 'order-id', orderNumber: 'RBAH-2026-00043', status: 'new', paymentStatus: 'awaiting_verification',
        paymentMethod: 'instapay', currency: 'EGP', subtotal: 698, shippingFee: 25, total: 723,
        createdAt: '2026-11-13T00:00:00.000Z', accessToken: 'a'.repeat(64),
      },
    });

    expect(JSON.parse(sessionStorage.getItem('rabah-pending-proof-v1') ?? '{}').orderNumber).toBe('RBAH-2026-00043');
    expect(localStorage.getItem('rabah-pending-proof-v1')).toBeNull();

    const originalCreateObjectUrl = URL.createObjectURL;
    (URL as any).createObjectURL = () => 'blob:proof-preview';
    try {
      const file = new File(['proof'], 'proof.png', { type: 'image/png' });
      component.onProofFileSelected({ target: { files: [file] } } as unknown as Event);
      const request = http.expectOne('/api/orders/RBAH-2026-00043/proof');
      expect(request.request.headers.get('X-Requested-With')).toBe('XMLHttpRequest');
      expect((request.request.body as FormData).get('accessToken')).toBe('a'.repeat(64));
      request.flush({ success: true, data: { orderNumber: 'RBAH-2026-00043', paymentStatus: 'awaiting_verification', proof: {} } });
    } finally {
      (URL as any).createObjectURL = originalCreateObjectUrl;
    }

    expect(component.orderSubmitted()).toBe(true);
    expect(component.proofAccessToken()).toBe('');
    expect(sessionStorage.getItem('rabah-pending-proof-v1')).toBeNull();
  });

  function savePending(over: Record<string, unknown> = {}) {
    sessionStorage.setItem('rabah-pending-proof-v1', JSON.stringify({
      orderNumber: 'RBAH-2026-00050', id: 'x', total: 500, currency: 'EGP', paymentMethod: 'instapay',
      createdAt: '2026-11-24T00:00:00.000Z', accessToken: 'b'.repeat(64), savedAt: Date.now(), ...over,
    }));
  }

  it('resumes a pending InstaPay proof upload after a page refresh without creating a new order', () => {
    savePending();
    const fixture = TestBed.createComponent(CheckoutPageComponent);
    fixture.detectChanges();
    const restored = fixture.componentInstance;
    expect(restored.order()?.orderNumber).toBe('RBAH-2026-00050');
    expect(restored.proofRestored()).toBe(true);
    expect(restored.proofAccessToken()).toBe('b'.repeat(64));
    expect((fixture.nativeElement as HTMLElement).querySelector('.proof-upload')).not.toBeNull();
    restored.submit();
    http.expectNone('/api/orders');
  });

  it('discards an expired or malformed pending proof', () => {
    savePending({ savedAt: Date.now() - 25 * 60 * 60 * 1000 });
    expect(TestBed.createComponent(CheckoutPageComponent).componentInstance.order()).toBeNull();
    expect(sessionStorage.getItem('rabah-pending-proof-v1')).toBeNull();
    savePending({ accessToken: 'short' });
    expect(TestBed.createComponent(CheckoutPageComponent).componentInstance.order()).toBeNull();
    expect(sessionStorage.getItem('rabah-pending-proof-v1')).toBeNull();
  });

  it('stops offering the upload when the server says the order is already paid', () => {
    savePending();
    const restored = TestBed.createComponent(CheckoutPageComponent).componentInstance;
    const originalCreateObjectUrl = URL.createObjectURL;
    (URL as any).createObjectURL = () => 'blob:p';
    try {
      restored.onProofFileSelected({ target: { files: [new File(['p'], 'p.png', { type: 'image/png' })] } } as unknown as Event);
      http.expectOne('/api/orders/RBAH-2026-00050/proof').flush(
        { success: false, error: { code: 'CONFLICT', message: 'This order is already paid' } }, { status: 409, statusText: 'Conflict' });
    } finally {
      (URL as any).createObjectURL = originalCreateObjectUrl;
    }
    expect(restored.proofError()).toBe('This order is already paid');
    expect(restored.proofAccessToken()).toBe('');
    expect(sessionStorage.getItem('rabah-pending-proof-v1')).toBeNull();
  });
});
