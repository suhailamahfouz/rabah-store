import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminOrder, AdminService } from '../services/admin.service';
import { AdminDashboardPageComponent } from './admin-dashboard-page';

describe('AdminDashboardPageComponent', () => {
  const storageKey = 'rabah-admin-demo-v1';

  beforeEach(() => {
    localStorage.removeItem(storageKey);
    TestBed.configureTestingModule({
      imports: [AdminDashboardPageComponent],
      providers: [provideRouter([]), { provide: AdminService, useValue: null }],
    });
  });

  afterEach(() => localStorage.removeItem(storageKey));

  function createComponent() {
    const fixture = TestBed.createComponent(AdminDashboardPageComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('starts in Egyptian Arabic with clearly labeled local demo data', () => {
    const { fixture, component } = createComponent();
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('.dashboard')?.getAttribute('dir')).toBe('rtl');
    expect(page.textContent).toContain('نظرة عامة على متجرك');
    expect(component.paymentLabel('awaiting_verification')).toBe('مستني مراجعة التحويل');
    expect(component.orders()).toHaveLength(4);
    expect(component.orders().filter((order) => order.orderStatus === 'new')).toHaveLength(1);
  });

  it('opens the mobile sidebar and closes it after choosing a section', () => {
    const { fixture, component } = createComponent();
    const toggle = fixture.nativeElement.querySelector('.mobile-menu-toggle') as HTMLButtonElement;

    toggle.click();
    fixture.detectChanges();
    expect(component.mobileMenuOpen()).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('.mobile-sidebar-backdrop')).not.toBeNull();

    component.selectTab('orders');
    fixture.detectChanges();
    expect(component.mobileMenuOpen()).toBe(false);
    expect(component.tab()).toBe('orders');
    expect(fixture.nativeElement.querySelector('.mobile-sidebar-backdrop')).toBeNull();
  });

  it('shows a centered in-app confirmation before deleting a product', () => {
    const { fixture, component } = createComponent();
    const product = component.products()[0];

    component.deleteProduct(product);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alertdialog"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain(product.name.ar);
    expect(component.products()).toHaveLength(4);

    component.cancelDelete();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alertdialog"]')).toBeNull();
    expect(component.products()).toHaveLength(4);

    component.deleteProduct(product);
    component.confirmDelete();
    fixture.detectChanges();
    expect(component.products()).toHaveLength(3);
    expect(component.successMessage()).toContain('المنتج اتمسح');
  });

  it('adds and saves a product only in local demo storage', () => {
    const { component } = createComponent();
    component.newProduct();
    Object.assign(component.productDraft!, {
      sku: 'BAG-NEW', slug: 'new-bag', nameAr: 'شنطة جديدة', nameEn: 'New bag',
      category: 'demo-bags', price: 500, stock: 3,
      images: [{ id: 'existing-image', url: 'https://example.com/bag.jpg', previewUrl: 'https://example.com/bag.jpg', alt: 'شنطة جديدة' }],
    });

    component.saveProduct();

    expect(component.products()).toHaveLength(5);
    expect(component.products()[0].name.ar).toBe('شنطة جديدة');
    expect(component.products()[0].images[0].url).toBe('https://example.com/bag.jpg');
    expect(component.successMessage()).toContain('تم حفظ المنتج');
    expect(JSON.parse(localStorage.getItem(storageKey)!).products).toHaveLength(5);
  });

  it('rejects malformed color inventory rows without changing the product list', () => {
    const { component } = createComponent();
    component.newProduct();
    Object.assign(component.productDraft!, {
      sku: 'BAG-INVALID', slug: 'invalid-bag', nameAr: 'حقيبة', nameEn: 'Bag', category: 'demo-bags', price: 100, stock: 2,
      variants: 'أحمر | Red | not-a-hex | two', images: [],
    });

    component.saveProduct();

    expect(component.products()).toHaveLength(4);
    expect(component.productDraft).not.toBeNull();
    expect(component.errorMessage()).not.toBe('');
  });

  it('updates order and payment statuses using the requested Egyptian labels', () => {
    const { component } = createComponent();
    const order: AdminOrder = component.orders()[0];

    component.saveOrderStatus(order, 'confirmed');
    component.savePaymentStatus(order, 'paid');

    expect(component.orders()[0].orderStatus).toBe('confirmed');
    expect(component.orders()[0].paymentStatus).toBe('paid');
    expect(component.statusLabel('confirmed')).toBe('اتأكد');
    expect(component.statusLabel('preparing')).toBe('بيتجهز');
    expect(component.statusLabel('shipped')).toBe('خرج للشحن');
    expect(component.statusLabel('completed')).toBe('اتسلّم');
    expect(component.statusLabel('cancelled')).toBe('اتلغى');
    expect(component.paymentLabel('pending')).toBe('مستني الدفع');
    expect(component.paymentLabel('awaiting_verification')).toBe('مستني مراجعة التحويل');
    expect(component.paymentLabel('paid')).toBe('تم الدفع');
    expect(component.paymentLabel('rejected')).toBe('التحويل مرفوض');
  });

  it('updates demo shipping settings and keeps them local after reload', () => {
    const { component } = createComponent();
    Object.assign(component.settingsDraft!, { deliveryFee: 40, freeShippingThreshold: 750 });

    component.saveSettings();

    expect(component.settings().deliveryFee).toBe(40);
    expect(component.settings().freeShippingThreshold).toBe(750);
    expect(component.successMessage()).toContain('التعديلات اتحفظت');

    const reloaded = TestBed.createComponent(AdminDashboardPageComponent).componentInstance;
    expect(reloaded.settings().deliveryFee).toBe(40);
    expect(reloaded.settings().freeShippingThreshold).toBe(750);
  });

  it('summarizes demo customers, sales and best-selling products', () => {
    const { component } = createComponent();

    expect(component.customers()).toHaveLength(3);
    expect(component.orders().reduce((total, order) => total + order.total, 0)).toBeGreaterThan(0);
    expect(component.bestSellers()[0].name.ar).toBe('شنطة تايف');
    expect(component.formatCurrency(1250)).toContain('ج.م.');
    expect(component.formatNumber(12)).not.toBe('12');
  });
});
