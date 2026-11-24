import { ColorSwatchesComponent } from '../components/color-swatches';
import { PRODUCT_COLOR_GROUPS, ProductColor } from '../data/product-colors';
import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { StoreService } from '../services/store.service';
import { AdminCategory, AdminCustomer, AdminCustomerDetail, AdminDashboardData, AdminDashboardSalesPeriod, AdminImageUploadScope, AdminOrder, AdminProduct, AdminProductImage, AdminProductPayload, AdminProductVariant, AdminSettings, AdminShippingZone, AdminService } from '../services/admin.service';

type AdminTab = 'overview' | 'orders' | 'products' | 'categories' | 'customers' | 'reports' | 'shipping' | 'settings';

interface ProductDraft {
  colorOptions?: ProductColor[];
  id?: string;
  sku: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  shortDescriptionAr: string;
  shortDescriptionEn: string;
  category: string;
  price: number;
  salePrice?: number;
  stock: number;
  variants: string;
  images: ProductImageDraft[];
  isActive: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
}

interface ProductImageDraft extends AdminProductImage {
  id: string;
  previewUrl: string;
  isUploading?: boolean;
}

interface CategoryDraft {
  id?: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  image: string;
  imagePublicId?: string;
  imagePreviewUrl?: string;
  isImageUploading?: boolean;
  sortOrder: number;
  isActive: boolean;
}

interface ShippingZoneDraft {
  id?: string;
  nameAr: string;
  nameEn: string;
  governorates: string;
  areas: string;
  price: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  isActive: boolean;
}

interface SalesMonth {
  label: string;
  total: number;
  percent: number;
}

type SettingsImageTarget = 'logo' | 'heroPoster' | 'promoBanner' | 'featuredCollection';

const DEMO_STORAGE_KEY = 'rabah-admin-demo-v1';
const IMAGE_FILENAME_EXTENSION = /\.(?:jpe?g|png|webp|gif|avif|heic|heif|bmp|tiff?)$/i;
const EMPTY_SETTINGS: AdminSettings = {
  storeName: '', logoUrl: '', logoPublicId: '',
  hero: { posterUrl: '', posterPublicId: '' },
  promoBanner: { image: '', imagePublicId: '', isActive: false },
  featuredCollection: { image: '', imagePublicId: '' },
  currency: 'EGP', deliveryFee: 0, freeShippingThreshold: null,
  announcement: { ar: '', en: '', isActive: false },
  contact: { phone: '', whatsapp: '', email: '' },
  social: { instagram: '', facebook: '', tiktok: '' },
  instapay: { enabled: false, identifier: '', accountName: '', instructions: { ar: '', en: '' } },
  shipping: { enabled: true, freeShipping: { enabled: false, threshold: 0 }, zones: [] },
};

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

const demoVariant = (ar: string, en: string, hex: string, stock: number): AdminProductVariant => ({
  color: { name: { ar, en }, hex },
  stock,
});

function createDemoData(): {
  products: AdminProduct[];
  categories: AdminCategory[];
  orders: AdminOrder[];
  settings: AdminSettings;
} {
  const categories: AdminCategory[] = [
    { _id: 'demo-bags', slug: 'bags', name: { ar: 'شنط', en: 'Bags' }, description: { ar: 'شنط لكل يوم.', en: 'Everyday bags.' }, image: '', sortOrder: 1, isActive: true },
    { _id: 'demo-accessories', slug: 'accessories', name: { ar: 'إكسسوارات', en: 'Accessories' }, description: { ar: 'تفاصيل بتكمّل إطلالتك.', en: 'Finishing touches.' }, image: '', sortOrder: 2, isActive: true },
    { _id: 'demo-gifts', slug: 'gifts', name: { ar: 'هدايا', en: 'Gifts' }, description: { ar: 'اختيارات حلوة للهدايا.', en: 'Lovely gifts.' }, image: '', sortOrder: 3, isActive: true },
  ];
  const products: AdminProduct[] = [
    {
      _id: 'demo-product-taif', sku: 'BAG-101', slug: 'taif-velvet-tote',
      name: { ar: 'شنطة تايف', en: 'Taif Velvet Tote' },
      description: { ar: 'شنطة عملية بتصميم أنيق.', en: 'A practical bag with an elegant design.' },
      shortDescription: { ar: 'شنطة أنيقة لكل يوم.', en: 'An elegant everyday bag.' },
      category: 'demo-bags', price: 1250, salePrice: 1100, stock: 0,
      variants: [demoVariant('نبيتي', 'Burgundy', '#641B2E', 5), demoVariant('بيج', 'Beige', '#E8D8C3', 3)],
      images: [], isActive: true, isFeatured: true, isBestSeller: true,
    },
    {
      _id: 'demo-product-salma', sku: 'BAG-102', slug: 'salma-crossbody',
      name: { ar: 'شنطة سلمى', en: 'Salma Crossbody' },
      description: { ar: 'شنطة خفيفة ومريحة للخروجات.', en: 'A light, comfortable bag for going out.' },
      shortDescription: { ar: 'خفيـفة وعملية.', en: 'Light and practical.' },
      category: 'demo-bags', price: 890, stock: 0,
      variants: [demoVariant('أسود', 'Black', '#29221F', 2), demoVariant('بني', 'Brown', '#8B5E3C', 2)],
      images: [], isActive: true, isFeatured: false, isBestSeller: true,
    },
    {
      _id: 'demo-product-luma', sku: 'ACC-204', slug: 'luma-bracelet',
      name: { ar: 'إسوارة لوما', en: 'Luma Bracelet' },
      description: { ar: 'إسوارة رقيقة بتفصيلة بسيطة.', en: 'A delicate bracelet with a simple detail.' },
      shortDescription: { ar: 'تفصيلة رقيقة.', en: 'A delicate touch.' },
      category: 'demo-accessories', price: 420, stock: 2,
      variants: [], images: [], isActive: true, isFeatured: false, isBestSeller: false,
    },
    {
      _id: 'demo-product-gift', sku: 'GFT-010', slug: 'rabah-gift-box',
      name: { ar: 'بوكس RABAH', en: 'RABAH Gift Box' },
      description: { ar: 'بوكس هدايا جاهز للمناسبات.', en: 'A gift box ready for special occasions.' },
      shortDescription: { ar: 'هدية جاهزة ومميزة.', en: 'A ready, thoughtful gift.' },
      category: 'demo-gifts', price: 650, stock: 0,
      variants: [], images: [], isActive: true, isFeatured: true, isBestSeller: false,
    },
  ];
  const orders: AdminOrder[] = [
    {
      _id: 'demo-order-1004', orderNumber: 'RBAH-DEMO-1004',
      customer: { fullName: 'سارة محمود', phone: '01000000004', governorate: 'القاهرة', city: 'مدينة نصر', address: 'شارع عباس العقاد', notes: '' },
      items: [{ name: { ar: 'شنطة تايف', en: 'Taif Velvet Tote' }, sku: 'BAG-101', quantity: 1, unitPrice: 1100 }],
      subtotal: 1100, shippingFee: 0, total: 1100, currency: 'EGP', paymentMethod: 'InstaPay',
      paymentStatus: 'awaiting_verification', orderStatus: 'new', createdAt: daysAgo(0),
    },
    {
      _id: 'demo-order-1003', orderNumber: 'RBAH-DEMO-1003',
      customer: { fullName: 'مريم أحمد', phone: '01000000003', governorate: 'الجيزة', city: 'الدقي', address: 'شارع التحرير', notes: 'ياريت الاتصال قبل التوصيل' },
      items: [{ name: { ar: 'شنطة سلمى', en: 'Salma Crossbody' }, sku: 'BAG-102', quantity: 1, unitPrice: 890 }],
      subtotal: 890, shippingFee: 50, total: 940, currency: 'EGP', paymentMethod: 'الدفع عند الاستلام',
      paymentStatus: 'pending', orderStatus: 'preparing', createdAt: daysAgo(2),
    },
    {
      _id: 'demo-order-1002', orderNumber: 'RBAH-DEMO-1002',
      customer: { fullName: 'نورهان علي', phone: '01000000002', governorate: 'الإسكندرية', city: 'سموحة', address: 'شارع فوزي معاذ', notes: '' },
      items: [
        { name: { ar: 'إسوارة لوما', en: 'Luma Bracelet' }, sku: 'ACC-204', quantity: 2, unitPrice: 420 },
        { name: { ar: 'شنطة تايف', en: 'Taif Velvet Tote' }, sku: 'BAG-101', quantity: 1, unitPrice: 1100 },
      ],
      subtotal: 1940, shippingFee: 0, total: 1940, currency: 'EGP', paymentMethod: 'InstaPay',
      paymentStatus: 'paid', orderStatus: 'shipped', createdAt: daysAgo(5),
    },
    {
      _id: 'demo-order-1001', orderNumber: 'RBAH-DEMO-1001',
      customer: { fullName: 'سارة محمود', phone: '01000000004', governorate: 'القاهرة', city: 'مدينة نصر', address: 'شارع عباس العقاد', notes: '' },
      items: [{ name: { ar: 'شنطة سلمى', en: 'Salma Crossbody' }, sku: 'BAG-102', quantity: 1, unitPrice: 890 }],
      subtotal: 890, shippingFee: 50, total: 940, currency: 'EGP', paymentMethod: 'الدفع عند الاستلام',
      paymentStatus: 'paid', orderStatus: 'completed', createdAt: daysAgo(13),
    },
  ];
  const settings: AdminSettings = {
    storeName: 'RABAH', logoUrl: '', logoPublicId: '',
    hero: { posterUrl: '', posterPublicId: '' },
    promoBanner: { image: '', imagePublicId: '', isActive: false },
    featuredCollection: { image: '', imagePublicId: '' },
    currency: 'EGP', deliveryFee: 50, freeShippingThreshold: 1000,
    announcement: { ar: 'التوصيل مجاني للطلبات فوق ١٠٠٠ جنيه', en: 'Free shipping over EGP 1,000', isActive: true },
    contact: { phone: '', whatsapp: '', email: '' },
    social: { instagram: '', facebook: '', tiktok: '' },
    instapay: { enabled: false, identifier: '', accountName: '', instructions: { ar: '', en: '' } },
    shipping: {
      enabled: true,
      freeShipping: { enabled: true, threshold: 1000 },
      zones: [{ _id: 'demo-zone-cairo', name: { ar: 'القاهرة الكبرى', en: 'Greater Cairo' }, governorates: ['القاهرة', 'الجيزة', 'القليوبية'], areas: [], price: 50, estimatedDaysMin: 1, estimatedDaysMax: 3, isActive: true }],
    },
  };
  return { products, categories, orders, settings };
}

function summarizeDemoCustomers(orders: AdminOrder[]): AdminCustomer[] {
  const customers = new Map<string, AdminCustomer>();
  for (const order of orders) {
    const key = order.customer.phone || order.customer.fullName;
    const current = customers.get(key) ?? {
      _id: `demo-customer-${customers.size + 1}`,
      name: order.customer.fullName,
      phone: order.customer.phone,
      createdAt: order.createdAt,
      orderCount: 0,
      totalSpent: 0,
      latestOrderAt: order.createdAt,
    };
    current.orderCount += 1;
    if (order.orderStatus !== 'cancelled') current.totalSpent += order.total;
    if ((current.latestOrderAt ?? '') < order.createdAt) current.latestOrderAt = order.createdAt;
    customers.set(key, current);
  }
  return [...customers.values()];
}

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [ColorSwatchesComponent, CommonModule, FormsModule, RouterLink],
  styleUrl: './admin-products.scss',
  template: `
    <section class="dashboard" dir="rtl">
      <button class="mobile-menu-toggle" type="button" [attr.aria-expanded]="mobileMenuOpen()" aria-controls="admin-sidebar" (click)="toggleMobileMenu()">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"></path></svg>
        <span>القائمة</span>
      </button>
      <button *ngIf="mobileMenuOpen()" class="mobile-sidebar-backdrop" type="button" aria-label="اقفل القائمة" (click)="closeMobileMenu()"></button>

      <div class="workspace">
        <aside id="admin-sidebar" class="sidebar" [class.mobile-open]="mobileMenuOpen()" (keydown.escape)="closeMobileMenu()">
          <a class="brand" routerLink="/" aria-label="RABAH">
            <img src="/logo-gold.png" alt="RABAH">
            <span>إدارة المتجر</span>
          </a>
          <button class="sidebar-close" type="button" aria-label="اقفل القائمة" (click)="closeMobileMenu()">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"></path></svg>
          </button>
          <p class="side-label">القائمة</p>
          <nav aria-label="أقسام لوحة التحكم">
            <button *ngFor="let item of tabs" type="button" [class.selected]="tab() === item.id" (click)="selectTab(item.id)">
              <span class="nav-icon" aria-hidden="true">
                <svg *ngIf="item.icon === 'shipping'" viewBox="0 0 24 24"><path d="M3 5h11v12H3zM14 9h4l3 4v4h-7M3 17h2m4 0h6m4 0h2"></path><circle cx="7" cy="18" r="2"></circle><circle cx="17" cy="18" r="2"></circle></svg>
                <svg *ngIf="item.icon === 'overview'" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect></svg>
                <svg *ngIf="item.icon === 'orders'" viewBox="0 0 24 24"><path d="M8 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"></path><rect x="8" y="2" width="8" height="4" rx="1"></rect><path d="m8 13 2.5 2.5L16 10"></path></svg>
                <svg *ngIf="item.icon === 'products'" viewBox="0 0 24 24"><path d="m12 3 9 4.5v9L12 21l-9-4.5v-9L12 3Z"></path><path d="m3.3 7.7 8.7 4.4 8.7-4.4M12 12v9"></path></svg>
                <svg *ngIf="item.icon === 'categories'" viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="1"></rect><rect x="13" y="3" width="8" height="8" rx="1"></rect><rect x="3" y="13" width="8" height="8" rx="1"></rect><rect x="13" y="13" width="8" height="8" rx="1"></rect></svg>
                <svg *ngIf="item.icon === 'customers'" viewBox="0 0 24 24"><circle cx="9" cy="8" r="4"></circle><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 4.5a4 4 0 0 1 0 7.5m2 3a5 5 0 0 1 3 4.5V21"></path></svg>
                <svg *ngIf="item.icon === 'reports'" viewBox="0 0 24 24"><path d="M4 20V10m8 10V4m8 16v-7"></path><path d="M2 20h20"></path></svg>
                <svg *ngIf="item.icon === 'settings'" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.7-1.4-2.4L7.3 15a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 2Z"></path></svg>
              </span>{{ item.label }}
            </button>
          </nav>
          <div class="side-bottom">
            <a routerLink="/">افتح المتجر <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"></path></svg></a>
            <button type="button" (click)="logout()">تسجيل الخروج</button>
          </div>
        </aside>

        <main class="main-content">
          <header class="page-heading">
            <div>
              <p class="eyebrow">RABAH · مساحة شغلك</p>
              <h1>{{ heading() }}</h1>
              <p>أهلاً بيك في لوحة تحكم RABAH 👋 تابع متجرك وأوردراتك من هنا.</p>
            </div>
            <span class="today">{{ today() }}</span>
          </header>

          <p class="feedback error" *ngIf="errorMessage()" role="alert">{{ errorMessage() }}</p>
          <p class="feedback success" *ngIf="successMessage()" role="status">{{ successMessage() }}</p>

          <div class="dialog-backdrop" *ngIf="productToDelete()" (click)="cancelDelete()" (keydown.escape)="cancelDelete()">
            <section
              class="confirm-dialog"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-dialog-title"
              aria-describedby="delete-dialog-description"
              dir="rtl"
              (click)="$event.stopPropagation()"
            >
              <span class="dialog-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3"></path></svg>
              </span>
              <h2 id="delete-dialog-title">تمسح المنتج؟</h2>
              <p id="delete-dialog-description">
                متأكد إنك عايز تمسح «{{ productToDelete()?.name?.ar }}»؟ المسح نهائي ومش هتقدر ترجع المنتج تاني.
              </p>
              <div class="dialog-actions">
                <button type="button" class="secondary" (click)="cancelDelete()">إلغاء</button>
                <button type="button" class="danger" (click)="confirmDelete()" [disabled]="isSaving()">أيوه، امسح المنتج</button>
              </div>
            </section>
          </div>

          <div class="dialog-backdrop" *ngIf="categoryToDelete()" (click)="cancelCategoryDelete()" (keydown.escape)="cancelCategoryDelete()">
            <section
              class="confirm-dialog"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="category-delete-dialog-title"
              aria-describedby="category-delete-dialog-description"
              tabindex="-1"
              (click)="$event.stopPropagation()"
            >
              <span class="dialog-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3"></path></svg>
              </span>
              <h2 id="category-delete-dialog-title">حذف القسم؟</h2>
              <p id="category-delete-dialog-description">
                سيتم حذف «{{ categoryToDelete()?.name?.ar }}» نهائيًا. لن يتم الحذف إذا كان القسم مرتبطًا بمنتجات.
              </p>
              <div class="dialog-actions">
                <button type="button" class="secondary" (click)="cancelCategoryDelete()" [disabled]="isSaving()">إلغاء</button>
                <button type="button" class="danger" (click)="confirmCategoryDelete()" [disabled]="isSaving()">نعم، احذف القسم</button>
              </div>
            </section>
          </div>

          <ng-container [ngSwitch]="tab()">
            <section class="content-section" *ngSwitchCase="'overview'">
              <ng-container *ngIf="dashboardData() as dashboard; else dashboardLoading">
                <div class="stat-grid">
                  <article class="stat-card sales-card"><span>إجمالي المبيعات</span><strong>{{ formatCurrency(dashboard.summary.sales) }}</strong><small>لا تشمل الطلبات الملغاة</small></article>
                  <article class="stat-card"><span>عدد الطلبات</span><strong>{{ formatNumber(dashboard.summary.orders) }}</strong><small>إجمالي الطلبات المسجلة</small></article>
                  <article class="stat-card"><span>الطلبات الجديدة</span><strong>{{ formatNumber(dashboard.summary.newOrders) }}</strong><small>تحتاج مراجعة</small></article>
                  <article class="stat-card"><span>الطلبات المعلقة</span><strong>{{ formatNumber(dashboard.summary.pendingOrders) }}</strong><small>مؤكدة أو قيد التجهيز أو الشحن</small></article>
                  <article class="stat-card"><span>الطلبات المكتملة</span><strong>{{ formatNumber(dashboard.summary.completedOrders) }}</strong><small>تم تسليمها</small></article>
                  <article class="stat-card"><span>الطلبات الملغاة</span><strong>{{ formatNumber(dashboard.summary.cancelledOrders) }}</strong><small>لا تدخل في المبيعات</small></article>
                  <article class="stat-card"><span>عدد المنتجات</span><strong>{{ formatNumber(dashboard.summary.products) }}</strong><small>في الكتالوج</small></article>
                  <article class="stat-card"><span>عدد العملاء</span><strong>{{ formatNumber(dashboard.summary.customers) }}</strong><small>الحسابات المسجلة</small></article>
                  <article class="stat-card"><span>مبيعات اليوم</span><strong>{{ formatCurrency(dashboard.dailySales.current) }}</strong><small>{{ salesComparison(dashboard.dailySales, 'أمس') }}</small></article>
                  <article class="stat-card"><span>مبيعات الشهر</span><strong>{{ formatCurrency(dashboard.monthlySales.current) }}</strong><small>{{ salesComparison(dashboard.monthlySales, 'الشهر الماضي') }}</small></article>
                </div>
              </ng-container>
              <ng-template #dashboardLoading><p class="empty">جارٍ تحميل إحصاءات المتجر…</p></ng-template>

              <div class="notice" *ngIf="awaitingPaymentCount()">
                <span aria-hidden="true">✦</span>
                <p>متنساش تراجع {{ formatNumber(awaitingPaymentCount()) }} تحويلات InstaPay.</p>
                <button type="button" class="text-button" (click)="selectTab('orders')">راجع الأوردرات</button>
              </div>

              <section class="panel">
                <div class="section-heading">
                  <div><p class="eyebrow">تابع الجديد</p><h2>آخر أوردرات المتجر</h2></div>
                  <button class="secondary" type="button" (click)="selectTab('orders')">شوف كل الأوردرات</button>
                </div>
                <div class="table-wrap" *ngIf="dashboardData()?.latestOrders?.length; else noRecentOrders">
                  <table>
                    <thead><tr><th>رقم الأوردر</th><th>العميل</th><th>الإجمالي</th><th>الحالة</th><th>وصل إمتى؟</th></tr></thead>
                    <tbody><tr *ngFor="let order of dashboardData()?.latestOrders">
                      <td><strong>{{ order.orderNumber }}</strong></td>
                      <td><strong>{{ order.customer.fullName }}</strong><small>{{ order.customer.phone }}</small></td>
                      <td>{{ formatCurrency(order.total, order.currency) }}</td>
                      <td><span class="status">{{ statusLabel(order.orderStatus) }}</span></td>
                      <td>{{ formatDate(order.createdAt) }}</td>
                    </tr></tbody>
                  </table>
                </div>
                <ng-template #noRecentOrders><p class="empty">مفيش أوردرات لحد دلوقتي.</p></ng-template>
              </section>

              <section class="panel quick-panel">
                <div class="section-heading"><div><p class="eyebrow">ابدأ بسرعة</p><h2>إيه اللي محتاج تعمله؟</h2></div></div>
                <div class="quick-actions">
                  <button type="button" (click)="selectTab('products'); newProduct()">ضيف منتج جديد <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg></button>
                  <button type="button" (click)="selectTab('categories'); newCategory()">ضيف قسم <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg></button>
                  <button type="button" (click)="selectTab('reports')">تابع مبيعاتك <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"></path></svg></button>
                </div>
              </section>
            </section>

            <section class="content-section" *ngSwitchCase="'orders'">
              <section class="panel">
                <div class="section-heading">
                  <div><p class="eyebrow">طلبات زباينك</p><h2>الأوردرات</h2></div>
                  <span class="hint">{{ formatNumber(orders().length) }} أوردر</span>
                </div>
                <div class="order-filters">
                  <input placeholder="بحث برقم الطلب أو اسم العميل أو الهاتف" [(ngModel)]="orderSearch" (ngModelChange)="loadOrders()">
                  <select [(ngModel)]="orderStatusFilter" (ngModelChange)="loadOrders()"><option value="">كل الحالات</option><option *ngFor="let status of orderStatuses" [value]="status">{{ statusLabel(status) }}</option></select>
                  <select [(ngModel)]="orderPaymentMethodFilter" (ngModelChange)="loadOrders()"><option value="">كل طرق الدفع</option><option value="cod">الدفع عند الاستلام</option><option value="instapay">InstaPay</option></select>
                  <input type="date" [(ngModel)]="orderDateFrom" (ngModelChange)="loadOrders()"><input type="date" [(ngModel)]="orderDateTo" (ngModelChange)="loadOrders()">
                </div>
                <div class="table-wrap" *ngIf="orders().length; else noOrders">
                  <table class="wide-table"><thead><tr>
                    <th>الأوردر</th><th>العميل والعنوان</th><th>الإجمالي</th><th>حالة الأوردر</th><th>حالة الدفع</th><th>التفاصيل</th>
                  </tr></thead><tbody>
                    <tr *ngFor="let order of orders()">
                      <td><strong>{{ order.orderNumber }}</strong><small>{{ formatDate(order.createdAt) }}</small></td>
                      <td><strong>{{ order.customer.fullName }}</strong><small>{{ order.customer.phone }} · {{ order.customer.governorate }}، {{ order.customer.city }}</small><small>{{ order.customer.address }}</small></td>
                      <td>{{ formatCurrency(order.total, order.currency) }}</td>
                      <td><select [ngModel]="order.orderStatus" (ngModelChange)="saveOrderStatus(order, $event)" [name]="'order-status-' + order._id" [attr.aria-label]="'حالة الأوردر ' + order.orderNumber">
                        <option *ngFor="let status of orderStatuses" [value]="status">{{ statusLabel(status) }}</option>
                      </select></td>
                      <td><select [ngModel]="order.paymentStatus" (ngModelChange)="savePaymentStatus(order, $event)" [name]="'payment-status-' + order._id" [attr.aria-label]="'حالة الدفع ' + order.orderNumber">
                        <option *ngFor="let status of paymentStatuses" [value]="status">{{ paymentLabel(status) }}</option>
                      </select><small>{{ paymentMethodLabel(order.paymentMethod) }}</small></td>
                      <td><details><summary>المنتجات ({{ formatNumber(order.items.length) }})</summary>
                        <ul><li *ngFor="let item of order.items">{{ item.name.ar }} × {{ formatNumber(item.quantity) }} — {{ formatCurrency(item.unitPrice, order.currency) }}<p *ngIf="item.color" class="item-note">{{ item.color.ar || item.color.en }}</p><p *ngIf="item.note" class="item-note">ملحوظة: {{ item.note }}</p></li></ul>
                        <small *ngIf="order.customer.notes">ملاحظات: {{ order.customer.notes }}</small>
                      </details></td>
                    </tr>
                  </tbody></table>
                </div>
                <ng-template #noOrders><p class="empty">لسه مفيش أوردرات.</p></ng-template>
              </section>
            </section>

            <section class="content-section" *ngSwitchCase="'products'">
              <section class="panel product-panel">
                <div class="section-heading">
                  <div><p class="eyebrow">كتالوج المتجر</p><h2>المنتجات <span class="catalog-count">{{ formatNumber(productTotal || products().length) }}</span></h2></div>
                  <button class="add-product-button" type="button" (click)="newProduct()"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>إضافة منتج</button>
                </div>
                <div class="product-filters">
                  <label class="search-filter">البحث عن منتج<span class="search-input"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="m16 16 4 4"></path></svg><input placeholder="اسم المنتج أو كود SKU" [(ngModel)]="productSearch" (ngModelChange)="productPage = 1; loadProducts()"></span></label>
                  <label>التصنيف<select [(ngModel)]="productCategory" (ngModelChange)="productPage = 1; loadProducts()"><option value="">كل التصنيفات</option><option *ngFor="let category of categories()" [value]="category._id">{{ category.name.ar }}</option></select></label>
                  <label>حالة العرض<select [(ngModel)]="productStatus" (ngModelChange)="productPage = 1; loadProducts()"><option value="all">كل الحالات</option><option value="active">ظاهر</option><option value="inactive">مخفي</option></select></label>
                  <label>السعر من<input type="number" min="0" inputmode="decimal" placeholder="٠ ج.م." [(ngModel)]="minPrice" (ngModelChange)="productPage = 1; loadProducts()"></label>
                  <label>السعر إلى<input type="number" min="0" inputmode="decimal" placeholder="بدون حد" [(ngModel)]="maxPrice" (ngModelChange)="productPage = 1; loadProducts()"></label>
                </div>
                <p class="highlights-caption">نظرة سريعة على المنتجات المعروضة</p>
                <div class="product-highlights">
                  <div class="product-highlight" [title]="productNames(featuredProducts())"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"></path></svg><span>منتجات مميزة</span><strong>{{ formatNumber(featuredProducts().length) }}</strong></div>
                  <div class="product-highlight" [title]="productNames(bestSellerProducts())"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 17 6-6 4 4 8-10M15 5h6v6"></path></svg><span>الأكثر مبيعًا</span><strong>{{ formatNumber(bestSellerProducts().length) }}</strong></div>
                  <div class="product-highlight" [title]="productNames(newArrivals())"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg><span>أحدث الإضافات</span><strong>{{ formatNumber(newArrivals().length) }}</strong></div>
                </div>
                <form class="editor" *ngIf="productDraft as draft" (ngSubmit)="saveProduct()" novalidate>
                  <h3>{{ draft.id ? 'عدّل بيانات المنتج' : 'ضيف منتج جديد' }}</h3>
                  <div class="form-grid">
                    <label>SKU<input name="sku" [(ngModel)]="draft.sku" required maxlength="40"></label>
                    <label>Slug<input name="slug" [(ngModel)]="draft.slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" dir="ltr"></label>
                    <label>اسم المنتج بالعربي<input name="nameAr" [(ngModel)]="draft.nameAr" required></label>
                    <label>اسم المنتج بالإنجليزي<input name="nameEn" [(ngModel)]="draft.nameEn" required dir="ltr"></label>
                    <label>القسم
                      <select name="category" [(ngModel)]="draft.category" required>
                        <option value="">اختار قسم</option>
                        <option *ngFor="let category of categories()" [value]="category._id" [disabled]="!category.isActive">{{ category.name.ar }}</option>
                      </select>
                    </label>
                    <label>السعر بالجنيه<input type="number" name="price" [(ngModel)]="draft.price" min="0" required></label>
                    <label>سعر العرض (اختياري)<input type="number" name="salePrice" [(ngModel)]="draft.salePrice" min="0"></label>
                    <label>المخزون<input type="number" name="stock" [(ngModel)]="draft.stock" min="0" required></label>
                    <section class="wide product-colors" aria-label="ألوان المنتج">
                      <h4>ألوان المنتج المتاحة <small>({{ draft.colorOptions?.length || 0 }})</small></h4>
                      <p>حددي الألوان المتوفرة فقط. اضغطي مرة أخرى لإلغاء اللون. المخزون إجمالي لكل الألوان.</p>
                      <div *ngFor="let group of colorGroups">
                        <h5>{{ group.title }}</h5>
                        <app-color-swatches [colors]="group.colors" [selected]="selectedColorHexes()" [showNames]="true" (choose)="toggleProductColor($event)" />
                      </div>
                      <button *ngIf="draft.colorOptions?.length" type="button" class="secondary" (click)="draft.colorOptions = []">إلغاء تحديد الألوان</button>
                    </section>
                    <div class="wide image-manager">
                      <div class="image-manager-heading">
                        <div>
                          <strong>صور المنتج</strong>
                          <small>أول صورة هي الرئيسية. ارفعي بديلًا أولًا ثم احفظي التعديل لحذف القديمة بأمان.</small>
                        </div>
                        <button type="button" class="secondary" (click)="productImageInput.click()" [disabled]="imageUploadsInProgress() > 0">
                          رفع صور
                        </button>
                        <input
                          #productImageInput
                          class="file-input"
                          type="file"
                          accept="image/*"
                          multiple
                          (change)="onProductImagesSelected($event)"
                        >
                      </div>
                      <p class="image-empty" *ngIf="!draft.images.length">لم تتم إضافة صور بعد.</p>
                      <div class="image-grid" *ngIf="draft.images.length">
                        <article class="image-card" *ngFor="let image of draft.images; let index = index" [class.primary]="index === 0">
                          <div class="image-preview">
                            <img [src]="image.previewUrl" [alt]="image.alt || draft.nameAr || 'معاينة صورة المنتج'">
                            <span class="uploading-badge" *ngIf="image.isUploading">جارٍ الرفع…</span>
                            <span class="primary-badge" *ngIf="index === 0">الرئيسية</span>
                          </div>
                          <div class="image-actions">
                            <button type="button" class="secondary" (click)="setPrimaryImage(index)" [disabled]="index === 0 || image.isUploading">رئيسية</button>
                            <button type="button" class="secondary" (click)="moveProductImage(index, -1)" [disabled]="index === 0 || image.isUploading">↑</button>
                            <button type="button" class="secondary" (click)="moveProductImage(index, 1)" [disabled]="index === draft.images.length - 1 || image.isUploading">↓</button>
                            <button type="button" class="secondary" (click)="replaceImageInput.click()" [disabled]="imageUploadsInProgress() > 0">استبدال</button>
                            <button type="button" class="danger" (click)="removeProductImage(index)" [disabled]="image.isUploading">حذف</button>
                            <input
                              #replaceImageInput
                              class="file-input"
                              type="file"
                              accept="image/*"
                              multiple
                              (change)="onProductImagesSelected($event, index)"
                            >
                          </div>
                        </article>
                      </div>
                    </div>
                    <label class="wide">وصف المنتج بالعربي<textarea name="descriptionAr" [(ngModel)]="draft.descriptionAr" rows="3"></textarea></label>
                    <label class="wide">وصف المنتج بالإنجليزي<textarea name="descriptionEn" [(ngModel)]="draft.descriptionEn" rows="3" dir="ltr"></textarea></label>
                    <label>وصف صغير بالعربي<input name="shortDescriptionAr" [(ngModel)]="draft.shortDescriptionAr"></label>
                    <label>وصف صغير بالإنجليزي<input name="shortDescriptionEn" [(ngModel)]="draft.shortDescriptionEn" dir="ltr"></label>
                  </div>
                  <div class="check-row">
                    <label><input type="checkbox" name="isActive" [(ngModel)]="draft.isActive"> ظاهر في المتجر</label>
                    <label><input type="checkbox" name="isFeatured" [(ngModel)]="draft.isFeatured"> منتج مميز</label>
                    <label><input type="checkbox" name="isBestSeller" [(ngModel)]="draft.isBestSeller"> من الأكثر مبيعًا</label>
                  </div>
                  <div class="form-actions"><button type="submit" [disabled]="isSaving() || imageUploadsInProgress() > 0">احفظ المنتج</button><button type="button" class="secondary" (click)="cancelProductEdit()">إلغاء</button></div>
                </form>

                <div class="table-wrap products-table-wrap" *ngIf="products().length; else noProducts">
                  <table class="products-table"><thead><tr><th scope="col">المنتج</th><th scope="col">السعر</th><th scope="col">المخزون</th><th scope="col">الحالة</th><th scope="col">إجراءات</th></tr></thead><tbody>
                    <tr *ngFor="let product of products()">
                      <td class="product-cell"><div class="product-identity"><img *ngIf="product.images[0]?.url; else productPlaceholder" [src]="product.images[0].url" [alt]="product.name.ar" loading="lazy"><ng-template #productPlaceholder><span class="product-placeholder" aria-label="بدون صورة"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l1 12H4L5 8ZM9 9V6a3 3 0 0 1 6 0v3"></path></svg></span></ng-template><span class="product-identity-copy"><strong [title]="product.name.ar">{{ product.name.ar }}</strong><small class="product-code" dir="ltr">{{ product.sku }}</small><small class="product-slug" dir="ltr" [title]="product.slug">{{ product.slug }}</small></span></div></td>
                      <td class="product-price" data-label="السعر"><strong>{{ formatCurrency(product.salePrice ?? product.price) }}</strong><del *ngIf="product.salePrice != null">{{ formatCurrency(product.price) }}</del></td>
                      <td class="product-stock" data-label="المخزون"><span class="stock-count" [class.stock-empty]="productStock(product) === 0">{{ productStock(product) === 0 ? 'نفد المخزون' : formatNumber(productStock(product)) + ' قطعة' }}</span></td>
                      <td class="product-status-cell"><span class="status" [class.inactive]="!product.isActive">{{ product.isActive ? 'ظاهر' : 'مخفي' }}</span></td>
                      <td class="product-actions-cell"><div class="product-actions"><button class="secondary" type="button" (click)="editProduct(product)" [attr.aria-label]="'تعديل ' + product.name.ar">تعديل</button><button class="secondary" type="button" (click)="toggleProduct(product)" [attr.aria-label]="(product.isActive ? 'إخفاء ' : 'إظهار ') + product.name.ar">{{ product.isActive ? 'إخفاء' : 'إظهار' }}</button><button class="danger" type="button" (click)="deleteProduct(product)" [attr.aria-label]="'حذف ' + product.name.ar">حذف</button></div></td>
                    </tr>
                  </tbody></table>
                </div>
                <div class="pagination" *ngIf="productPages > 1"><button class="secondary" type="button" [disabled]="productPage === 1" (click)="changeProductPage(productPage - 1)">السابق</button><span>صفحة {{ productPage }} من {{ productPages }} · {{ productTotal }} منتج</span><button class="secondary" type="button" [disabled]="productPage === productPages" (click)="changeProductPage(productPage + 1)">التالي</button></div>
                <ng-template #noProducts><p class="empty">مفيش منتجات لسه. ضيف أول منتج لمتجرك.</p></ng-template>
              </section>
            </section>

            <section class="content-section" *ngSwitchCase="'categories'">
              <section class="panel">
                <div class="section-heading">
                  <div><p class="eyebrow">رتّبي منتجاتك</p><h2>الأقسام</h2></div>
                  <button type="button" (click)="newCategory()">ضيف قسم</button>
                </div>
                <form class="editor" *ngIf="categoryDraft as draft" (ngSubmit)="saveCategory()" novalidate>
                  <h3>{{ draft.id ? 'عدّل القسم' : 'ضيف قسم جديد' }}</h3>
                  <div class="form-grid">
                    <label>Slug<input name="categorySlug" [(ngModel)]="draft.slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" dir="ltr"></label>
                    <label>ترتيب القسم<input type="number" name="sortOrder" [(ngModel)]="draft.sortOrder"></label>
                    <label>اسم القسم بالعربي<input name="categoryAr" [(ngModel)]="draft.nameAr" required></label>
                    <label>اسم القسم بالإنجليزي<input name="categoryEn" [(ngModel)]="draft.nameEn" required dir="ltr"></label>
                    <div class="wide single-image-manager">
                      <div class="image-manager-heading"><div><strong>صورة القسم</strong><small>ارفعي الصورة من جهازك — بدون روابط.</small></div><button type="button" class="secondary" (click)="categoryImageInput.click()" [disabled]="imageUploadsInProgress() > 0">{{ draft.image ? 'تغيير الصورة' : 'رفع صورة' }}</button><input #categoryImageInput class="file-input" type="file" accept="image/*" (change)="onCategoryImageSelected($event)"></div>
                      <div class="single-image-preview" *ngIf="draft.imagePreviewUrl || draft.image"><img [src]="draft.imagePreviewUrl || draft.image" [alt]="draft.nameAr || 'معاينة صورة القسم'"><span class="uploading-badge" *ngIf="draft.isImageUploading">جارٍ الرفع…</span><button type="button" class="danger image-delete" (click)="removeCategoryImage()" [disabled]="draft.isImageUploading">حذف الصورة</button></div>
                    </div>
                    <label>وصف القسم بالعربي<textarea name="categoryDescriptionAr" [(ngModel)]="draft.descriptionAr"></textarea></label>
                    <label>وصف القسم بالإنجليزي<textarea name="categoryDescriptionEn" [(ngModel)]="draft.descriptionEn" dir="ltr"></textarea></label>
                  </div>
                  <label class="check-label"><input type="checkbox" name="categoryActive" [(ngModel)]="draft.isActive"> ظاهر في المتجر</label>
                  <div class="form-actions"><button type="submit" [disabled]="isSaving() || imageUploadsInProgress() > 0">احفظ القسم</button><button type="button" class="secondary" (click)="cancelCategoryEdit()">إلغاء</button></div>
                </form>
                <div class="table-wrap" *ngIf="categories().length; else noCategories">
                  <table><thead><tr><th>القسم</th><th>Slug</th><th>الترتيب</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody>
                    <tr *ngFor="let category of categories()">
                      <td>{{ category.name.ar }}</td><td dir="ltr">{{ category.slug }}</td><td>{{ formatNumber(category.sortOrder) }}</td>
                      <td><span class="status" [class.inactive]="!category.isActive">{{ category.isActive ? 'ظاهر' : 'مخفي' }}</span></td>
                      <td class="row-actions"><button class="secondary" type="button" (click)="editCategory(category)">تعديل</button><button class="secondary" type="button" (click)="toggleCategory(category)">{{ category.isActive ? 'إخفاء' : 'إظهار' }}</button><button class="danger" type="button" (click)="deleteCategory(category)">حذف</button></td>
                    </tr>
                  </tbody></table>
                </div>
                <ng-template #noCategories><p class="empty">لسه مفيش أقسام. ضيف قسم عشان ترتّب منتجاتك.</p></ng-template>
              </section>
            </section>

            <section class="content-section" *ngSwitchCase="'customers'">
              <section class="panel">
                <div class="section-heading"><div><p class="eyebrow">بيانات حسابات العملاء الفعلية</p><h2>العملاء</h2></div><span class="hint">{{ formatNumber(customersTotal) }} عميل</span></div>
                <div class="customer-filters" role="search" aria-label="البحث في العملاء">
                  <input placeholder="البحث بالاسم" [(ngModel)]="customerNameSearch" (ngModelChange)="customerPage = 1; loadCustomers()">
                  <input placeholder="البحث بالبريد الإلكتروني" type="search" dir="ltr" [(ngModel)]="customerEmailSearch" (ngModelChange)="customerPage = 1; loadCustomers()">
                  <input placeholder="البحث برقم الهاتف" type="search" dir="ltr" [(ngModel)]="customerPhoneSearch" (ngModelChange)="customerPage = 1; loadCustomers()">
                  <button type="button" class="secondary" (click)="clearCustomerSearch()">مسح البحث</button>
                </div>
                <div class="table-wrap" *ngIf="customers().length; else noCustomers">
                  <table><thead><tr><th>العميل</th><th>البريد الإلكتروني</th><th>رقم الموبايل</th><th>تاريخ إنشاء الحساب</th><th>عدد الطلبات</th><th>إجمالي المشتريات</th><th>إجراء</th></tr></thead><tbody>
                    <tr *ngFor="let customer of customers()">
                      <td><strong>{{ customer.name }}</strong></td><td dir="ltr">{{ customer.email || '—' }}</td><td dir="ltr">{{ customer.phone || '—' }}</td>
                      <td>{{ formatDate(customer.createdAt) }}</td><td>{{ formatNumber(customer.orderCount) }}</td><td>{{ formatCurrency(customer.totalSpent) }}</td>
                      <td><button type="button" class="secondary" (click)="showCustomer(customer._id)">عرض البيانات</button></td>
                    </tr>
                  </tbody></table>
                </div>
                <ng-template #noCustomers><p class="empty">لا توجد حسابات عملاء مطابقة للبحث.</p></ng-template>
                <div class="pagination" *ngIf="customersPages > 1">
                  <button type="button" class="secondary" [disabled]="customerPage === 1" (click)="changeCustomerPage(customerPage - 1)">السابق</button>
                  <span>صفحة {{ formatNumber(customerPage) }} من {{ formatNumber(customersPages) }}</span>
                  <button type="button" class="secondary" [disabled]="customerPage === customersPages" (click)="changeCustomerPage(customerPage + 1)">التالي</button>
                </div>
                <p class="settings-note">لا يتم عرض كلمات المرور أو رموز الجلسات أو أي بيانات مصادقة حساسة.</p>
              </section>

              <section class="panel customer-details" *ngIf="isCustomerDetailsLoading() || selectedCustomer()">
                <p class="empty" *ngIf="isCustomerDetailsLoading()">جارٍ تحميل بيانات العميل…</p>
                <ng-container *ngIf="!isCustomerDetailsLoading() && selectedCustomer() as detail">
                  <div class="section-heading">
                    <div><p class="eyebrow">بيانات العميل</p><h2>{{ detail.customer.name }}</h2></div>
                    <button type="button" class="secondary" (click)="closeCustomerDetails()">إغلاق</button>
                  </div>
                  <div class="customer-profile">
                    <p><span>البريد الإلكتروني</span><strong dir="ltr">{{ detail.customer.email || '—' }}</strong></p>
                    <p><span>رقم الموبايل</span><strong dir="ltr">{{ detail.customer.phone || '—' }}</strong></p>
                    <p><span>تاريخ إنشاء الحساب</span><strong>{{ formatDate(detail.customer.createdAt) }}</strong></p>
                    <p><span>عدد الطلبات</span><strong>{{ formatNumber(detail.summary.orderCount) }}</strong></p>
                    <p><span>إجمالي المشتريات</span><strong>{{ formatCurrency(detail.summary.totalSpent) }}</strong></p>
                  </div>
                  <h3>سجل الطلبات</h3>
                  <div class="table-wrap" *ngIf="detail.orders.length; else noCustomerOrders">
                    <table class="wide-table"><thead><tr><th>رقم الطلب</th><th>التاريخ</th><th>المنتجات</th><th>الإجمالي</th><th>حالة الطلب</th><th>حالة الدفع</th></tr></thead><tbody>
                      <tr *ngFor="let order of detail.orders">
                        <td><strong>{{ order.orderNumber }}</strong></td><td>{{ formatDate(order.createdAt) }}</td>
                        <td><details><summary>المنتجات ({{ formatNumber(order.items.length) }})</summary><ul><li *ngFor="let item of order.items">{{ item.name.ar || item.name.en || item.sku }} × {{ formatNumber(item.quantity) }}<p *ngIf="item.color" class="item-note">{{ item.color.ar || item.color.en }}</p><p *ngIf="item.note" class="item-note">ملحوظة: {{ item.note }}</p></li></ul></details></td>
                        <td>{{ formatCurrency(order.total, order.currency) }}</td><td><span class="status">{{ statusLabel(order.orderStatus) }}</span></td><td><span class="status">{{ paymentLabel(order.paymentStatus) }}</span></td>
                      </tr>
                    </tbody></table>
                  </div>
                  <ng-template #noCustomerOrders><p class="empty">لا توجد طلبات مرتبطة بهذا الحساب بعد.</p></ng-template>
                </ng-container>
              </section>
            </section>

            <section class="content-section" *ngSwitchCase="'reports'">
              <div class="report-grid">
                <section class="panel report-panel">
                  <div class="section-heading"><div><p class="eyebrow">نظرة على البيع</p><h2>مبيعات آخر ٦ شهور</h2></div></div>
                  <div class="chart" role="img" aria-label="رسم بياني لمبيعات آخر ست شهور">
                    <div class="chart-column" *ngFor="let month of salesByMonth()">
                      <strong>{{ formatCurrency(month.total) }}</strong>
                      <div class="bar-track"><span class="bar" [style.height.%]="month.percent"></span></div>
                      <small>{{ month.label }}</small>
                    </div>
                  </div>
                </section>
                <section class="panel">
                  <div class="section-heading"><div><p class="eyebrow">اللي زباينك بيحبوه</p><h2>الأكثر مبيعًا</h2></div></div>
                  <ol class="best-sellers" *ngIf="bestSellers().length; else noBestSellers">
                    <li *ngFor="let product of bestSellers()"><span>{{ product.name.ar }}</span><strong>{{ formatNumber(product.sold) }} قطعة</strong></li>
                  </ol>
                  <ng-template #noBestSellers><p class="empty">لسه مفيش مبيعات كفاية.</p></ng-template>
                </section>
              </div>
              <div class="report-stats" *ngIf="dashboardData() as dashboard">
                <article class="stat-card"><span>إجمالي المبيعات</span><strong>{{ formatCurrency(dashboard.summary.sales) }}</strong></article>
                <article class="stat-card"><span>متوسط الأوردر</span><strong>{{ formatCurrency(averageOrderValue()) }}</strong></article>
                <article class="stat-card"><span>الأوردرات اللي اتسلّمت</span><strong>{{ formatNumber(dashboard.summary.completedOrders) }}</strong></article>
              </div>
            </section>

            <section class="content-section" *ngSwitchCase="'shipping'">
              <section class="panel">
                <div class="section-heading"><div><p class="eyebrow">أسعار حسب المحافظة أو المنطقة</p><h2>إدارة الشحن</h2></div><button type="button" (click)="newShippingZone()">إضافة منطقة</button></div>
                <div class="editor" *ngIf="shippingZoneDraft as zone">
                  <div class="form-grid">
                    <label>اسم المنطقة بالعربي<input name="zoneNameAr" [(ngModel)]="zone.nameAr"></label>
                    <label>اسم المنطقة بالإنجليزية<input name="zoneNameEn" [(ngModel)]="zone.nameEn" dir="ltr"></label>
                    <label class="wide">المحافظات (افصل بينها بفاصلة)<input name="governorates" [(ngModel)]="zone.governorates"></label>
                    <label class="wide">المدن أو المناطق داخل المحافظة (اختياري، افصل بينها بفاصلة)<input name="areas" [(ngModel)]="zone.areas"></label>
                    <label>سعر الشحن<input type="number" name="zonePrice" [(ngModel)]="zone.price" min="0"></label>
                    <label>أقل مدة توصيل بالأيام<input type="number" name="zoneMin" [(ngModel)]="zone.estimatedDaysMin" min="1"></label>
                    <label>أقصى مدة توصيل بالأيام<input type="number" name="zoneMax" [(ngModel)]="zone.estimatedDaysMax" min="1"></label>
                  </div>
                  <label class="check-label"><input type="checkbox" name="zoneActive" [(ngModel)]="zone.isActive"> المنطقة متاحة للشحن</label>
                  <div class="form-actions"><button type="button" (click)="saveShippingZone()">حفظ المنطقة</button><button type="button" class="secondary" (click)="shippingZoneDraft = null">إلغاء</button></div>
                </div>
                <div class="editor settings-editor" *ngIf="settingsDraft as settings">
                  <div class="check-row"><label><input type="checkbox" name="shippingEnabled" [(ngModel)]="settings.shipping.enabled"> تفعيل الشحن</label><label><input type="checkbox" name="freeShippingEnabled" [(ngModel)]="settings.shipping.freeShipping.enabled"> تفعيل الشحن المجاني</label></div>
                  <label class="form-grid">الحد الأدنى للشحن المجاني<input type="number" name="shippingThreshold" [(ngModel)]="settings.shipping.freeShipping.threshold" min="0"></label>
                  <div class="table-wrap"><table class="shipping-table"><thead><tr><th>المحافظة</th><th>المنطقة</th><th>سعر الشحن</th><th>مدة التوصيل</th><th>حالة التفعيل</th><th>إجراءات</th></tr></thead><tbody><tr *ngFor="let zone of settings.shipping.zones"><td>{{ zone.governorates.join('، ') }}</td><td><strong>{{ zone.name.ar }}</strong><small>{{ zone.areas.length ? zone.areas.join('، ') : 'كل المحافظة' }}</small></td><td>{{ zone.price }} {{ settings.currency }}</td><td>{{ zone.estimatedDaysMin }} - {{ zone.estimatedDaysMax }} يوم</td><td><span class="status" [class.inactive]="!zone.isActive">{{ zone.isActive ? 'مفعّلة' : 'متوقفة' }}</span></td><td class="row-actions"><button type="button" class="secondary" (click)="editShippingZone(zone)">تعديل</button><button type="button" class="secondary" (click)="toggleShippingZone(zone)">{{ zone.isActive ? 'تعطيل' : 'تفعيل' }}</button><button type="button" class="danger" (click)="deleteShippingZone(zone)">حذف</button></td></tr></tbody></table></div>
                  <div class="form-actions"><button type="button" (click)="saveShippingSettings()" [disabled]="isSaving()">حفظ إعدادات الشحن</button></div>
                </div>
                <p class="settings-note">يتم إعادة حساب السعر والتحقق منه داخل الخادم عند إنشاء الطلب، ويُحفظ السعر النهائي داخل الطلب.</p>
              </section>
            </section>

            <section class="content-section" *ngSwitchCase="'settings'">
              <section class="panel">
                <div class="section-heading"><div><p class="eyebrow">ظبّط شكل المتجر والتوصيل</p><h2>إعدادات المتجر</h2></div></div>
                <form class="editor settings-editor" *ngIf="settingsDraft as settings" (ngSubmit)="saveSettings()" novalidate>
                  <div class="form-grid">
                    <label>اسم المتجر<input name="storeName" [(ngModel)]="settings.storeName" required></label>
                    <div class="wide site-images">
                      <div class="site-images-heading"><strong>صور المتجر</strong><small>رفع مباشر من الجهاز مع معاينة قبل الحفظ.</small></div>
                      <div class="site-image-grid">
                        <div class="single-image-manager">
                          <div class="image-manager-heading"><strong>شعار المتجر</strong><button type="button" class="secondary" (click)="logoImageInput.click()" [disabled]="imageUploadsInProgress() > 0">{{ settings.logoUrl ? 'تغيير' : 'رفع صورة' }}</button><input #logoImageInput class="file-input" type="file" accept="image/*" (change)="onSettingsImageSelected($event, 'logo')"></div>
                          <div class="single-image-preview" *ngIf="settingsImagePreview('logo')"><img [src]="settingsImagePreview('logo')" alt="معاينة شعار المتجر"><button type="button" class="danger image-delete" (click)="removeSettingsImage('logo')" [disabled]="imageUploadsInProgress() > 0">حذف</button></div>
                        </div>
                        <div class="single-image-manager">
                          <div class="image-manager-heading"><strong>صورة خلفية الهيرو</strong><button type="button" class="secondary" (click)="heroImageInput.click()" [disabled]="imageUploadsInProgress() > 0">{{ settings.hero.posterUrl ? 'تغيير' : 'رفع صورة' }}</button><input #heroImageInput class="file-input" type="file" accept="image/*" (change)="onSettingsImageSelected($event, 'heroPoster')"></div>
                          <div class="single-image-preview" *ngIf="settingsImagePreview('heroPoster')"><img [src]="settingsImagePreview('heroPoster')" alt="معاينة صورة الهيرو"><button type="button" class="danger image-delete" (click)="removeSettingsImage('heroPoster')" [disabled]="imageUploadsInProgress() > 0">حذف</button></div>
                        </div>
                        <div class="single-image-manager">
                          <div class="image-manager-heading"><strong>صورة البانر الترويجي</strong><button type="button" class="secondary" (click)="promoBannerInput.click()" [disabled]="imageUploadsInProgress() > 0">{{ settings.promoBanner.image ? 'تغيير' : 'رفع صورة' }}</button><input #promoBannerInput class="file-input" type="file" accept="image/*" (change)="onSettingsImageSelected($event, 'promoBanner')"></div>
                          <div class="single-image-preview" *ngIf="settingsImagePreview('promoBanner')"><img [src]="settingsImagePreview('promoBanner')" alt="معاينة البانر"><button type="button" class="danger image-delete" (click)="removeSettingsImage('promoBanner')" [disabled]="imageUploadsInProgress() > 0">حذف</button></div>
                        </div>
                        <div class="single-image-manager">
                          <div class="image-manager-heading"><strong>صورة المجموعة المميزة</strong><button type="button" class="secondary" (click)="featuredImageInput.click()" [disabled]="imageUploadsInProgress() > 0">{{ settings.featuredCollection.image ? 'تغيير' : 'رفع صورة' }}</button><input #featuredImageInput class="file-input" type="file" accept="image/*" (change)="onSettingsImageSelected($event, 'featuredCollection')"></div>
                          <div class="single-image-preview" *ngIf="settingsImagePreview('featuredCollection')"><img [src]="settingsImagePreview('featuredCollection')" alt="معاينة صورة المجموعة"><button type="button" class="danger image-delete" (click)="removeSettingsImage('featuredCollection')" [disabled]="imageUploadsInProgress() > 0">حذف</button></div>
                        </div>
                      </div>
                      <label class="check-label"><input type="checkbox" name="promoBannerActive" [(ngModel)]="settings.promoBanner.isActive"> اعرض البانر الترويجي في الصفحة الرئيسية</label>
                    </div>
                    <label>العملة<input name="currency" [(ngModel)]="settings.currency" required dir="ltr"></label>
                    <label>مصاريف التوصيل بالجنيه<input type="number" name="deliveryFee" [(ngModel)]="settings.deliveryFee" min="0" required></label>
                    <label>الشحن المجاني من مبلغ كام؟ (سيبه فاضي عشان توقفه)<input type="number" name="freeShippingThreshold" [(ngModel)]="settings.freeShippingThreshold" min="0"></label>
                    <label>رقم التليفون<input name="phone" [(ngModel)]="settings.contact.phone" dir="ltr"></label>
                    <label>رقم واتساب<input name="whatsapp" [(ngModel)]="settings.contact.whatsapp" dir="ltr"></label>
                    <label>الإيميل<input type="email" name="email" [(ngModel)]="settings.contact.email" dir="ltr"></label>
                    <label>Instagram<input name="instagram" [(ngModel)]="settings.social.instagram" dir="ltr"></label>
                    <label>Facebook<input name="facebook" [(ngModel)]="settings.social.facebook" dir="ltr"></label>
                    <label>TikTok<input name="tiktok" [(ngModel)]="settings.social.tiktok" dir="ltr"></label>
                    <label>الإعلان بالعربي<input name="announcementAr" [(ngModel)]="settings.announcement.ar"></label>
                    <label>الإعلان بالإنجليزي<input name="announcementEn" [(ngModel)]="settings.announcement.en" dir="ltr"></label>
                    <label>معرّف InstaPay (رقم موبايل أو IPA)<input name="instapayIdentifier" [(ngModel)]="settings.instapay.identifier" dir="ltr"></label>
                    <label>اسم صاحب الحساب<input name="instapayAccountName" [(ngModel)]="settings.instapay.accountName"></label>
                    <label>تعليمات التحويل بالعربي<textarea name="instapayInstructionsAr" [(ngModel)]="settings.instapay.instructions.ar" rows="2"></textarea></label>
                    <label>Transfer instructions in English<textarea name="instapayInstructionsEn" [(ngModel)]="settings.instapay.instructions.en" rows="2" dir="ltr"></textarea></label>
                  </div>
                  <label class="check-label"><input type="checkbox" name="announcementActive" [(ngModel)]="settings.announcement.isActive"> اعرض الإعلان في المتجر</label>
                  <label class="check-label"><input type="checkbox" name="instapayEnabled" [(ngModel)]="settings.instapay.enabled"> فعّل InstaPay في صفحة إتمام الطلب</label>
                  <div class="form-actions"><button type="submit" [disabled]="isSaving() || imageUploadsInProgress() > 0">احفظ التعديلات</button></div>
                </form>
              </section>
            </section>
          </ng-container>
        </main>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: #faf7f1; }
    .dashboard { position: relative; min-height: 100vh; padding: 1rem clamp(.75rem, 3vw, 2.5rem) 3rem; color: #29221f; }
    .image-manager, .single-image-manager, .site-images { display: grid; gap: .8rem; padding: .9rem; border: 1px solid #e5dacb; border-radius: .85rem; background: #fffdf9; }
    .image-manager-heading, .site-images-heading { display: flex; align-items: center; justify-content: space-between; gap: .8rem; }
    .image-manager-heading > div, .site-images-heading { display: grid; gap: .2rem; }
    .image-manager-heading small, .site-images-heading small { color: #806f5e; font-size: .76rem; }
    .file-input { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
    .image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(145px, 1fr)); gap: .8rem; }
    .image-card, .single-image-preview { position: relative; overflow: hidden; border: 1px solid #eadfce; border-radius: .65rem; background: #f7f1e8; }
    .image-preview, .single-image-preview { min-height: 130px; }
    .image-preview img, .single-image-preview img { display: block; width: 100%; height: 160px; object-fit: cover; }
    .image-card.primary { border-color: #b89a63; box-shadow: 0 0 0 1px #b89a63; }
    .image-actions { display: flex; flex-wrap: wrap; gap: .35rem; padding: .55rem; }
    .uploading-badge, .primary-badge { position: absolute; top: .55rem; inset-inline-start: .55rem; padding: .22rem .45rem; border-radius: 999px; background: rgba(69,17,31,.86); color: #fff; font-size: .68rem; }
    .primary-badge { inset-inline-start: auto; inset-inline-end: .55rem; background: #b89a63; }
    .image-delete { position: absolute; inset-inline-end: .55rem; bottom: .55rem; }
    .site-image-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .8rem; }
    .demo-banner { display: flex; justify-content: center; align-items: center; gap: .55rem; margin: 0 auto 1rem; color: #6d4d32; font-size: .82rem; text-align: center; }
    .demo-banner span { color: #b89a63; }
    .workspace { display: grid; width: min(1500px, 100%); min-height: calc(100vh - 4.5rem); grid-template-columns: 248px minmax(0, 1fr); gap: 1.25rem; margin: auto; }
    .sidebar { display: flex; position: sticky; top: 1rem; height: calc(100vh - 2rem); min-height: 580px; flex-direction: column; padding: 1.25rem; border-radius: 1.2rem; background: #45111f; color: #fff; box-shadow: 0 16px 38px rgba(69, 17, 31, .14); }
    .brand { display: flex; align-items: center; gap: .8rem; padding: .3rem .3rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,.13); color: #fff; text-decoration: none; }
    .brand img { width: 3rem; height: 3rem; object-fit: contain; }
    .brand span { color: #e8d8c3; font-size: .86rem; }
    .side-label { margin: 1.4rem .65rem .6rem; color: #cbb8aa; font-size: .75rem; }
    .sidebar nav { display: grid; gap: .3rem; }
    .sidebar nav button, .side-bottom button, .side-bottom a { display: flex; align-items: center; justify-content: flex-start; gap: .7rem; width: 100%; padding: .75rem .7rem; border: 0; border-radius: .65rem; background: transparent; color: #f8f2eb; font: inherit; text-align: right; text-decoration: none; cursor: pointer; }
    .sidebar nav button.selected { background: #641b2e; box-shadow: inset -3px 0 #b89a63; }
    .sidebar nav button:hover, .side-bottom a:hover, .side-bottom button:hover { background: rgba(255,255,255,.08); }
    .nav-icon { display: grid; width: 1.6rem; place-items: center; color: #e8d8c3; }
    .nav-icon svg { width: 1.15rem; height: 1.15rem; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.65; }
    .side-bottom { display: grid; gap: .2rem; margin-top: auto; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,.13); }
    .side-bottom a { justify-content: space-between; color: #e8d8c3; font-size: .88rem; }
    .side-bottom button { color: #d7b6ac; font-size: .84rem; }
    .mobile-menu-toggle, .sidebar-close, .mobile-sidebar-backdrop { display: none; }
    .mobile-menu-toggle svg, .sidebar-close svg { width: 1.2rem; height: 1.2rem; fill: none; stroke: currentColor; stroke-linecap: round; stroke-width: 1.8; }
    .main-content { min-width: 0; padding: .8rem 0 2rem; }
    .page-heading, .section-heading { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
    .page-heading { margin: 0 0 1.5rem; }
    .eyebrow { margin: 0 0 .4rem; color: #a98756; font-size: .73rem; font-weight: 700; }
    h1, h2, h3 { margin: 0; color: #45111f; }
    h1 { font-size: clamp(1.7rem, 3vw, 2.3rem); }
    h2 { font-size: 1.2rem; }
    h3 { margin-bottom: 1rem; font-size: 1.05rem; }
    .page-heading p:not(.eyebrow) { margin: .45rem 0 0; color: #746a62; font-size: .9rem; }
    .today { align-self: flex-start; padding: .55rem .85rem; border: 1px solid #e8d8c3; border-radius: 999px; background: #fffdf9; color: #6d625a; font-size: .82rem; white-space: nowrap; }
    .content-section { display: grid; gap: 1.1rem; }
    .stat-grid, .report-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .85rem; }
    .stat-card, .panel { border: 1px solid rgba(84, 33, 44, .1); border-radius: 1rem; background: #fffdf9; box-shadow: 0 8px 26px rgba(41, 34, 31, .035); }
    .stat-card { display: grid; align-content: start; gap: .55rem; min-width: 0; padding: 1.1rem; }
    .stat-card > span { color: #73685f; font-size: .84rem; }
    .stat-card strong { color: #641b2e; font-size: clamp(1.25rem, 2vw, 1.8rem); overflow-wrap: anywhere; }
    .stat-card small { color: #998e83; font-size: .72rem; line-height: 1.5; }
    .sales-card { background: linear-gradient(140deg, #641b2e, #45111f); }
    .sales-card > span, .sales-card small { color: #f0dfcf; }
    .sales-card strong { color: #fff; }
    .panel { min-width: 0; padding: 1.3rem; }
    .section-heading { margin-bottom: 1.05rem; }
    .section-heading .eyebrow { margin-bottom: .3rem; }
    button { padding: .66rem .92rem; border: 1px solid #641b2e; border-radius: 999px; background: #641b2e; color: #fff; font: inherit; font-size: .82rem; cursor: pointer; white-space: nowrap; }
    button:hover { filter: brightness(1.08); }
    button:disabled { opacity: .48; cursor: not-allowed; }
    button.secondary { border-color: #e6d9cd; background: #fffdf9; color: #641b2e; }
    button.danger { border-color: #b42318; background: transparent; color: #a32d25; }
    .text-button { padding: .2rem; border: 0; background: transparent; color: #641b2e; text-decoration: underline; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; text-align: right; }
    th, td { min-width: 84px; padding: .8rem .65rem; border-bottom: 1px solid rgba(84, 33, 44, .08); vertical-align: middle; }
    th { color: #897e75; font-size: .75rem; font-weight: 600; white-space: nowrap; }
    td { color: #302925; font-size: .83rem; }
    td small { display: block; max-width: 240px; margin-top: .2rem; color: #8b8077; font-size: .72rem; white-space: normal; }
    .wide-table { min-width: 850px; }
    .product-cell { display: flex; min-width: 200px; align-items: center; gap: .6rem; }
    .product-cell img { width: 2.5rem; height: 2.5rem; border-radius: .5rem; object-fit: cover; background: #f1e9df; }
    .product-cell span { min-width: 0; }
    .row-actions { display: flex; min-width: 185px; flex-wrap: wrap; gap: .3rem; }
    .row-actions button { padding: .42rem .62rem; font-size: .74rem; }
    select { max-width: 175px; padding: .5rem; border: 1px solid #ded5ca; border-radius: .55rem; background: #fffdf9; color: #362d29; font: inherit; font-size: .78rem; }
    .status { display: inline-block; padding: .3rem .6rem; border-radius: 999px; background: #f3eadc; color: #795b33; font-size: .74rem; white-space: nowrap; }
    .status.inactive { background: #f5e5e3; color: #9e332b; }
    .empty, .hint, .settings-note { color: #877c72; font-size: .86rem; }
    .customer-filters { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) auto; gap: .65rem; margin: .8rem 0 1rem; }
    .customer-details { margin-top: 1rem; }
    .customer-details h3 { margin: 1.35rem 0 .7rem; color: #4d202a; font-size: 1.05rem; }
    .customer-profile { display: grid; grid-template-columns: repeat(5, minmax(120px, 1fr)); gap: .65rem; }
    .customer-profile p { display: grid; gap: .25rem; margin: 0; padding: .75rem; border-radius: .7rem; background: #fbf7f2; }
    .customer-profile span { color: #877c72; font-size: .72rem; }
    .customer-profile strong { color: #4d202a; font-size: .84rem; overflow-wrap: anywhere; }
    .notice { display: flex; align-items: center; gap: .7rem; padding: .9rem 1rem; border: 1px solid #e8d8c3; border-radius: .85rem; background: #f5eddf; color: #5c452b; }
    .notice > span { color: #a78040; }
    .notice p { flex: 1; margin: 0; font-size: .86rem; }
    .quick-panel { padding-bottom: 1.1rem; }
    .quick-actions { display: flex; flex-wrap: wrap; gap: .55rem; }
    .quick-actions button { display: flex; align-items: center; gap: .6rem; border-color: #e6d9cd; background: #faf7f1; color: #641b2e; }
    .quick-actions svg { width: 1.05rem; height: 1.05rem; fill: none; stroke: #b89a63; stroke-linecap: round; stroke-width: 1.8; }
    .editor { margin: 0 0 1.2rem; padding: 1.15rem; border: 1px solid #e8d8c3; border-radius: .9rem; background: #faf7f1; }
    .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .8rem 1rem; }
    .form-grid label { display: grid; gap: .4rem; color: #5b5149; font-size: .8rem; }
    input, textarea { width: 100%; min-width: 0; box-sizing: border-box; padding: .67rem .72rem; border: 1px solid #ded5ca; border-radius: .55rem; background: #fffdf9; color: #29221f; font: inherit; font-size: .87rem; }
    input:focus, textarea:focus, select:focus { outline: 2px solid rgba(184,154,99,.38); border-color: #b89a63; }
    input[type="checkbox"] { width: auto; accent-color: #641b2e; }
    .wide { grid-column: 1 / -1; }
    .check-row { display: flex; flex-wrap: wrap; gap: 1rem; margin: 1rem 0; }
    .check-row label, .check-label { display: flex; align-items: center; gap: .45rem; color: #5b5149; font-size: .82rem; }
    .form-actions { display: flex; gap: .5rem; margin-top: 1rem; }
    .settings-note { margin: 1rem 0 0; }
    details summary { color: #641b2e; cursor: pointer; }
    details ul { min-width: 190px; padding-inline-start: 1.2rem; }
    .feedback { margin: 0 0 1rem; padding: .75rem 1rem; border-radius: .6rem; font-size: .88rem; }
    .error { color: #9e332b; background: #f8e9e7; }
    .success { color: #24633d; background: #e8f4ec; }
    .dialog-backdrop { display: grid; position: fixed; z-index: 100; inset: 0; place-items: center; padding: 1.25rem; background: rgba(32, 19, 23, .58); backdrop-filter: blur(5px); }
    .confirm-dialog { width: min(420px, 100%); box-sizing: border-box; padding: 1.75rem; border: 1px solid #e8d8c3; border-radius: 1.2rem; background: #fffdf9; box-shadow: 0 24px 80px rgba(28, 12, 17, .28); text-align: center; animation: dialog-enter 160ms ease-out; }
    .dialog-icon { display: grid; width: 3.25rem; height: 3.25rem; place-items: center; margin: 0 auto 1rem; border: 1px solid #efd5d0; border-radius: 50%; background: #fbefed; color: #a32d25; }
    .dialog-icon svg { width: 1.5rem; height: 1.5rem; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.7; }
    .confirm-dialog h2 { margin: 0; color: #45111f; font-size: 1.3rem; }
    .confirm-dialog p { margin: .65rem 0 1.4rem; color: #746a62; font-size: .9rem; line-height: 1.8; }
    .dialog-actions { display: flex; justify-content: center; gap: .6rem; }
    .dialog-actions button { min-width: 7rem; }
    .dialog-actions button.danger { background: #641b2e; color: #fff; }
    @keyframes dialog-enter { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @media (max-width: 700px) { .site-image-grid { grid-template-columns: 1fr; } .image-manager-heading { align-items: flex-start; } }
    @media (max-width: 470px) { .confirm-dialog { padding: 1.35rem; } .dialog-actions button { min-width: 0; flex: 1; } }
    @media (prefers-reduced-motion: reduce) { .confirm-dialog { animation: none; } }
    .report-grid { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(260px, .8fr); gap: 1rem; }
    .chart { display: grid; height: 240px; grid-template-columns: repeat(6, 1fr); gap: .6rem; padding-top: .6rem; }
    .chart-column { display: grid; grid-template-rows: 1.5rem 1fr 1.4rem; justify-items: center; min-width: 0; }
    .chart-column strong { max-width: 100%; overflow: hidden; color: #75695f; font-size: .62rem; text-overflow: ellipsis; white-space: nowrap; }
    .chart-column small { color: #82776e; font-size: .72rem; }
    .bar-track { display: flex; width: min(2.2rem, 80%); height: 100%; align-items: flex-end; overflow: hidden; border-radius: .45rem .45rem 0 0; background: #f4eee6; }
    .bar { width: 100%; min-height: 5px; border-radius: .4rem .4rem 0 0; background: linear-gradient(0deg, #641b2e, #b89a63); }
    .best-sellers { display: grid; gap: .8rem; margin: .5rem 0; padding-inline-start: 1.4rem; color: #641b2e; }
    .best-sellers li span { display: inline-block; width: min(58%, 210px); color: #3b322d; }
    .best-sellers li strong { color: #8e744b; font-size: .8rem; }
    .report-stats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  `],
})
export class AdminDashboardPageComponent {
  private readonly router = inject(Router);
  private readonly storefront = inject(StoreService);
  private readonly adminApi = inject(AdminService, { optional: true });

  readonly tabs: Array<{ id: AdminTab; label: string; icon: string }> = [
    { id: 'overview', label: 'نظرة عامة', icon: 'overview' },
    { id: 'orders', label: 'الأوردرات', icon: 'orders' },
    { id: 'products', label: 'المنتجات', icon: 'products' },
    { id: 'categories', label: 'الأقسام', icon: 'categories' },
    { id: 'customers', label: 'العملاء', icon: 'customers' },
    { id: 'reports', label: 'التقارير', icon: 'reports' },
    { id: 'shipping', label: 'إدارة الشحن', icon: 'shipping' },
    { id: 'settings', label: 'إعدادات المتجر', icon: 'settings' },
  ];
  readonly orderStatuses = ['new', 'confirmed', 'preparing', 'shipped', 'completed', 'cancelled'];
  readonly paymentStatuses = ['pending', 'awaiting_verification', 'paid', 'rejected'];
  readonly tab = signal<AdminTab>('overview');
  readonly mobileMenuOpen = signal(false);
  readonly products = signal<AdminProduct[]>([]);
  readonly featuredProducts = computed(() => this.products().filter((product) => product.isFeatured));
  readonly bestSellerProducts = computed(() => this.products().filter((product) => product.isBestSeller));
  readonly newArrivals = computed(() => [...this.products()].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')).slice(0, 5));
  readonly categories = signal<AdminCategory[]>([]);
  readonly orders = signal<AdminOrder[]>([]);
  readonly customers = signal<AdminCustomer[]>([]);
  readonly selectedCustomer = signal<AdminCustomerDetail | null>(null);
  readonly isCustomerDetailsLoading = signal(false);
  readonly settings = signal<AdminSettings>(EMPTY_SETTINGS);
  /** Overview figures always come from the aggregate dashboard endpoint. */
  readonly dashboardData = signal<AdminDashboardData | null>(null);
  readonly salesByMonth = computed<SalesMonth[]>(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      const total = this.orders()
        .filter((order) => {
          const createdAt = new Date(order.createdAt);
          return order.orderStatus !== 'cancelled' && createdAt.getFullYear() === date.getFullYear() && createdAt.getMonth() === date.getMonth();
        })
        .reduce((sum, order) => sum + order.total, 0);
      return { label: new Intl.DateTimeFormat('ar-EG', { month: 'short' }).format(date), total, percent: 0 };
    });
    const maximum = Math.max(...months.map((month) => month.total), 1);
    return months.map((month) => ({ ...month, percent: Math.max(4, (month.total / maximum) * 100) }));
  });
  readonly bestSellers = computed(() => {
    const soldBySku = new Map<string, number>();
    for (const order of this.orders()) {
      if (order.orderStatus === 'cancelled') continue;
      for (const item of order.items) soldBySku.set(item.sku, (soldBySku.get(item.sku) ?? 0) + item.quantity);
    }
    return this.products()
      .map((product) => ({ name: product.name, sold: soldBySku.get(product.sku) ?? 0 }))
      .filter((product) => product.sold > 0)
      .sort((left, right) => right.sold - left.sold)
      .slice(0, 5);
  });
  readonly isSaving = signal(false);
  readonly imageUploadsInProgress = signal(0);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly productToDelete = signal<AdminProduct | null>(null);
  readonly categoryToDelete = signal<AdminCategory | null>(null);
  private readonly settingsImagePreviews: Partial<Record<SettingsImageTarget, string>> = {};
  productDraft: ProductDraft | null = null;
  categoryDraft: CategoryDraft | null = null;
  settingsDraft: AdminSettings | null = null;
  shippingZoneDraft: ShippingZoneDraft | null = null;
  productSearch = '';
  productCategory = '';
  productStatus: 'all' | 'active' | 'inactive' = 'all';
  minPrice: number | null = null;
  maxPrice: number | null = null;
  productPage = 1;
  productPages = 1;
  productTotal = 0;
  private readonly productLimit = 20;
  orderSearch = '';
  orderStatusFilter = '';
  orderPaymentMethodFilter = '';
  orderDateFrom = '';
  orderDateTo = '';
  customerNameSearch = '';
  customerEmailSearch = '';
  customerPhoneSearch = '';
  customerPage = 1;
  customersPages = 1;
  customersTotal = 0;
  private readonly customerLimit = 25;

  constructor() {
    // Sample data is only for the offline demo (no AdminService). When the real
    // API is available the dashboard starts empty and never shows or saves
    // sample records, so an API failure cannot look like real store data.
    if (!this.adminApi) this.loadDemoData();
    this.loadDashboard();
    this.adminApi?.settings().subscribe({
      next: ({ data }) => {
        this.settings.set(this.withShippingDefaults(data));
        this.settingsDraft = this.cloneSettings(this.settings());
      },
      error: () => this.errorMessage.set('تعذر تحميل إعدادات المتجر من الخادم.'),
    });
    this.adminApi?.products().subscribe({
      next: ({ data, pagination }) => { this.products.set(data); this.productPage = pagination.page; this.productPages = pagination.pages; this.productTotal = pagination.total; },
      error: () => this.errorMessage.set('تعذر تحميل المنتجات من الخادم.'),
    });
    this.adminApi?.categories().subscribe({
      next: ({ data }) => this.categories.set(data),
      error: () => this.errorMessage.set('تعذر تحميل الأقسام من الخادم.'),
    });
    this.loadOrders();
    this.loadCustomers();
  }

  loadDashboard(): void {
    if (!this.adminApi) return;
    this.adminApi.dashboard().subscribe({
      next: ({ data }) => this.dashboardData.set(data),
      error: () => this.errorMessage.set('تعذر تحميل إحصاءات المتجر من الخادم.'),
    });
  }

  loadOrders(): void {
    if (!this.adminApi) return;
    this.adminApi.orders({ search: this.orderSearch, status: this.orderStatusFilter, paymentMethod: this.orderPaymentMethodFilter, dateFrom: this.orderDateFrom, dateTo: this.orderDateTo }).subscribe({
      next: ({ data }) => this.orders.set(data),
      error: () => this.errorMessage.set('تعذر تحميل الطلبات من الخادم.'),
    });
  }

  loadCustomers(): void {
    if (!this.adminApi) return;
    this.selectedCustomer.set(null);
    this.adminApi.customers({
      name: this.customerNameSearch,
      email: this.customerEmailSearch,
      phone: this.customerPhoneSearch,
      page: this.customerPage,
      limit: this.customerLimit,
    }).subscribe({
      next: ({ data, pagination }) => {
        this.customers.set(data);
        this.customerPage = pagination.page;
        this.customersPages = pagination.pages;
        this.customersTotal = pagination.total;
      },
      error: () => this.errorMessage.set('تعذر تحميل بيانات العملاء من الخادم.'),
    });
  }

  changeCustomerPage(page: number): void {
    if (page < 1 || page > this.customersPages) return;
    this.customerPage = page;
    this.loadCustomers();
  }

  clearCustomerSearch(): void {
    this.customerNameSearch = '';
    this.customerEmailSearch = '';
    this.customerPhoneSearch = '';
    this.customerPage = 1;
    this.loadCustomers();
  }

  showCustomer(id: string): void {
    if (!this.adminApi) return;
    this.isCustomerDetailsLoading.set(true);
    this.selectedCustomer.set(null);
    this.adminApi.customer(id).subscribe({
      next: ({ data }) => {
        this.selectedCustomer.set(data);
        this.isCustomerDetailsLoading.set(false);
      },
      error: () => {
        this.isCustomerDetailsLoading.set(false);
        this.errorMessage.set('تعذر تحميل سجل طلبات العميل من الخادم.');
      },
    });
  }

  closeCustomerDetails(): void {
    this.selectedCustomer.set(null);
    this.isCustomerDetailsLoading.set(false);
  }

  loadProducts(): void {
    if (!this.adminApi) return;
    this.adminApi.products({ page: this.productPage, limit: this.productLimit, search: this.productSearch, category: this.productCategory, status: this.productStatus, minPrice: this.minPrice, maxPrice: this.maxPrice }).subscribe({
      next: ({ data, pagination }) => { this.products.set(data); this.productPage = pagination.page; this.productPages = pagination.pages; this.productTotal = pagination.total; },
      error: () => this.errorMessage.set('تعذر تحميل المنتجات من الخادم.'),
    });
  }

  changeProductPage(page: number): void { this.productPage = page; this.loadProducts(); }

  heading(): string {
    const labels: Record<AdminTab, string> = {
      overview: 'نظرة عامة على متجرك',
      orders: 'الأوردرات',
      products: 'المنتجات',
      categories: 'الأقسام',
      customers: 'العملاء',
      reports: 'تقارير متجرك',
      shipping: 'إدارة الشحن',
      settings: 'إعدادات المتجر',
    };
    return labels[this.tab()];
  }

  today(): string {
    return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'full' }).format(new Date());
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 }).format(value);
  }

  formatCurrency(value: number, currency = 'EGP'): string {
    return `${this.formatNumber(value)} ${currency === 'EGP' ? 'ج.م.' : currency}`;
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium' }).format(new Date(value));
  }

  salesComparison(period: AdminDashboardSalesPeriod, previousLabel: string): string {
    if (period.changePercent === null) return `لا تتوفر مقارنة مع ${previousLabel}`;
    const direction = period.changePercent >= 0 ? 'زيادة' : 'انخفاض';
    return `${direction} ${this.formatNumber(Math.abs(period.changePercent))}٪ عن ${previousLabel}`;
  }

  awaitingPaymentCount(): number {
    return this.orders().filter((order) => order.paymentStatus === 'awaiting_verification').length;
  }

  averageOrderValue(): number {
    const eligible = this.orders().filter((order) => order.orderStatus !== 'cancelled');
    return eligible.length ? Math.round(eligible.reduce((sum, order) => sum + order.total, 0) / eligible.length) : 0;
  }

  completedOrdersCount(): number {
    return this.orders().filter((order) => order.orderStatus === 'completed').length;
  }

  selectTab(tab: AdminTab): void {
    this.tab.set(tab);
    this.closeMobileMenu();
    this.clearFeedback();
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  readonly colorGroups = PRODUCT_COLOR_GROUPS;
  selectedColorHexes(): string[] { return this.productDraft?.colorOptions?.map(color => color.hex) ?? []; }
  toggleProductColor(color: ProductColor): void {
    if (!this.productDraft) return;
    const current = this.productDraft.colorOptions ?? [];
    this.productDraft.colorOptions = current.some(item => item.hex === color.hex)
      ? current.filter(item => item.hex !== color.hex) : [...current, color];
  }

  newProduct(): void {
    this.releaseDraftImagePreviews(this.productDraft);
    this.productDraft = {
      sku: '', slug: '', nameAr: '', nameEn: '', descriptionAr: '', descriptionEn: '',
      shortDescriptionAr: '', shortDescriptionEn: '', category: '', price: 0, stock: 0,
      salePrice: undefined, colorOptions: [], variants: '', images: [], isActive: true, isFeatured: false, isBestSeller: false,
    };
  }

  editProduct(product: AdminProduct): void {
    this.releaseDraftImagePreviews(this.productDraft);
    this.productDraft = {
      id: product._id, sku: product.sku, slug: product.slug, nameAr: product.name.ar, nameEn: product.name.en,
      descriptionAr: product.description.ar, descriptionEn: product.description.en,
      shortDescriptionAr: product.shortDescription.ar, shortDescriptionEn: product.shortDescription.en,
      category: typeof product.category === 'string' ? product.category : product.category._id,
      price: product.price, salePrice: product.salePrice, stock: this.productStock(product),
      variants: '',
      colorOptions: (product.colorOptions ?? []).map(color => ({ ...color, name: { ...color.name } })),
      images: product.images.map((image) => ({
        id: this.newId('image'),
        url: image.url,
        publicId: image.publicId,
        previewUrl: image.url,
        alt: image.alt || product.name.ar,
      })),
      isActive: product.isActive, isFeatured: product.isFeatured, isBestSeller: product.isBestSeller,
    };
  }

  onProductImagesSelected(event: Event, replacementIndex?: number): void {
    const input = event.target as HTMLInputElement;
    const draft = this.productDraft;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!draft || !files.length) return;

    const replacement = replacementIndex == null ? undefined : draft.images[replacementIndex];
    // Accept all files — the server handles type/size validation
    if (!this.adminApi) {
      this.errorMessage.set('خدمة رفع الصور غير متاحة حاليًا.');
      return;
    }

    const placeholders = files.map((file) => ({
      id: this.newId('image'),
      url: '',
      previewUrl: URL.createObjectURL(file),
      alt: draft.nameAr.trim(),
      isUploading: true,
    }));
    const insertionIndex = replacement ? replacementIndex! : draft.images.length;
    draft.images = [
      ...draft.images.slice(0, insertionIndex),
      ...placeholders,
      ...draft.images.slice(insertionIndex),
    ];
    this.imageUploadsInProgress.update((count) => count + 1);
    this.clearFeedback();

    this.adminApi.uploadProductImages(files).pipe(
      finalize(() => this.imageUploadsInProgress.update((count) => Math.max(0, count - 1))),
    ).subscribe({
      next: ({ data }) => {
        if (this.productDraft !== draft || data.length !== placeholders.length) {
          this.revokeImagePreviews(placeholders);
          if (this.productDraft === draft) this.removeDraftImages(draft, placeholders.map((image) => image.id));
          this.errorMessage.set('تعذر مطابقة الصور المرفوعة مع المعاينات. حاولي مرة أخرى.');
          return;
        }

        const uploadedById = new Map(placeholders.map((image, index) => [image.id, data[index]]));
        draft.images = draft.images.map((image) => {
          const uploaded = uploadedById.get(image.id);
          if (!uploaded) return image;
          this.revokeImagePreview(image);
          return {
            ...image,
            url: uploaded.url,
            publicId: uploaded.publicId,
            previewUrl: uploaded.url,
            alt: image.alt || draft.nameAr.trim(),
            isUploading: false,
          };
        });
        if (replacement) {
          draft.images = draft.images.filter((image) => image.id !== replacement.id);
        }
      },
      error: (error: unknown) => {
        if (this.productDraft === draft) this.removeDraftImages(draft, placeholders.map((image) => image.id));
        this.revokeImagePreviews(placeholders);
        this.errorMessage.set(this.imageUploadError(error, 'تعذر رفع الصور. تحققي من النوع والحجم ثم حاولي مرة أخرى.'));
      },
    });
  }

  setPrimaryImage(index: number): void {
    this.moveProductImage(index, -index);
  }

  moveProductImage(index: number, offset: number): void {
    const draft = this.productDraft;
    const target = index + offset;
    if (!draft || index < 0 || target < 0 || index >= draft.images.length || target >= draft.images.length) return;
    const images = [...draft.images];
    const [image] = images.splice(index, 1);
    images.splice(target, 0, image);
    draft.images = images;
  }

  removeProductImage(index: number): void {
    const draft = this.productDraft;
    const image = draft?.images[index];
    if (!draft || !image || image.isUploading) return;
    this.revokeImagePreview(image);
    draft.images = draft.images.filter((_, imageIndex) => imageIndex !== index);
  }

  onCategoryImageSelected(event: Event): void {
    const draft = this.categoryDraft;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!draft || !file) return;
    if (!this.adminApi) {
      this.errorMessage.set('خدمة رفع الصور غير متاحة حاليًا.');
      return;
    }
    this.revokeCategoryImagePreview(draft);
    draft.imagePreviewUrl = URL.createObjectURL(file);
    draft.isImageUploading = true;
    this.imageUploadsInProgress.update((count) => count + 1);
    this.clearFeedback();
    this.adminApi.uploadImage(file, 'categories').pipe(
      finalize(() => {
        if (this.categoryDraft === draft) draft.isImageUploading = false;
        this.imageUploadsInProgress.update((count) => Math.max(0, count - 1));
      }),
    ).subscribe({
      next: ({ data }) => {
        const image = data[0];
        if (this.categoryDraft !== draft || !image) return;
        this.revokeCategoryImagePreview(draft);
        draft.image = image.url;
        draft.imagePublicId = image.publicId;
        draft.imagePreviewUrl = image.url;
      },
      error: (error: unknown) => {
        if (this.categoryDraft === draft) {
          this.revokeCategoryImagePreview(draft);
          draft.imagePreviewUrl = draft.image;
        }
        this.errorMessage.set(this.imageUploadError(error, 'تعذر رفع الصورة. حاولي مرة أخرى.'));
      },
    });
  }

  removeCategoryImage(): void {
    const draft = this.categoryDraft;
    if (!draft || draft.isImageUploading) return;
    this.revokeCategoryImagePreview(draft);
    draft.image = '';
    draft.imagePublicId = '';
    draft.imagePreviewUrl = '';
  }

  cancelCategoryEdit(): void {
    this.revokeCategoryImagePreview(this.categoryDraft);
    this.categoryDraft = null;
  }

  settingsImagePreview(target: SettingsImageTarget): string {
    return this.settingsImagePreviews[target] ?? this.readSettingsImage(this.settingsDraft, target).url;
  }

  onSettingsImageSelected(event: Event, target: SettingsImageTarget): void {
    const draft = this.settingsDraft;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!draft || !file) return;
    if (!this.adminApi) {
      this.errorMessage.set('خدمة رفع الصور غير متاحة حاليًا.');
      return;
    }
    this.revokeSettingsImagePreview(target);
    this.settingsImagePreviews[target] = URL.createObjectURL(file);
    this.imageUploadsInProgress.update((count) => count + 1);
    this.clearFeedback();
    const scope: Exclude<AdminImageUploadScope, 'products'> = target === 'logo' || target === 'heroPoster' ? 'branding' : 'banners';
    this.adminApi.uploadImage(file, scope).pipe(
      finalize(() => this.imageUploadsInProgress.update((count) => Math.max(0, count - 1))),
    ).subscribe({
      next: ({ data }) => {
        const image = data[0];
        if (this.settingsDraft !== draft || !image) return;
        this.revokeSettingsImagePreview(target);
        this.writeSettingsImage(draft, target, image.url, image.publicId);
      },
      error: (error: unknown) => {
        this.revokeSettingsImagePreview(target);
        this.errorMessage.set(this.imageUploadError(error, 'تعذر رفع الصورة. حاولي مرة أخرى.'));
      },
    });
  }

  removeSettingsImage(target: SettingsImageTarget): void {
    const draft = this.settingsDraft;
    if (!draft || this.imageUploadsInProgress() > 0) return;
    this.revokeSettingsImagePreview(target);
    this.writeSettingsImage(draft, target, '', '');
  }

  cancelProductEdit(): void {
    this.releaseDraftImagePreviews(this.productDraft);
    this.productDraft = null;
  }

  saveProduct(): void {
    const draft = this.productDraft;
    if (!draft) return;
    if (this.imageUploadsInProgress() > 0 || draft.images.some((image) => image.isUploading)) {
      this.errorMessage.set('انتظري حتى يكتمل رفع الصور قبل حفظ المنتج.');
      return;
    }
    if (!draft.sku.trim() || !draft.slug.trim() || !draft.nameAr.trim() || !draft.nameEn.trim() || !draft.category) {
      this.errorMessage.set('كمّل بيانات المنتج المطلوبة الأول.');
      return;
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(draft.slug.trim()) || Number(draft.price) < 0 || Number(draft.stock) < 0) {
      this.errorMessage.set('راجع الـSlug والسعر والكمية، واكتبهم بشكل صحيح.');
      return;
    }
    if (draft.salePrice != null && Number(draft.salePrice) > Number(draft.price)) {
      this.errorMessage.set('سعر العرض مينفعش يكون أعلى من السعر الأساسي.');
      return;
    }
    const variants: AdminProductVariant[] = [];
    const product: AdminProduct = {
      _id: draft.id ?? this.newId('product'),
      sku: draft.sku.trim(),
      slug: draft.slug.trim(),
      name: { ar: draft.nameAr.trim(), en: draft.nameEn.trim() },
      description: { ar: draft.descriptionAr.trim(), en: draft.descriptionEn.trim() },
      shortDescription: { ar: draft.shortDescriptionAr.trim(), en: draft.shortDescriptionEn.trim() },
      category: draft.category,
      price: Number(draft.price),
      salePrice: draft.salePrice == null || Number.isNaN(Number(draft.salePrice)) ? undefined : Number(draft.salePrice),
      stock: Number(draft.stock),
      colorOptions: draft.colorOptions ?? [],
      variants,
      images: draft.images.map((image) => ({ url: image.url, publicId: image.publicId, alt: image.alt || draft.nameAr.trim() })),
      isActive: draft.isActive,
      isFeatured: draft.isFeatured,
      isBestSeller: draft.isBestSeller,
    };
    const payload: AdminProductPayload = { sku: product.sku, slug: product.slug, name: product.name, description: product.description, shortDescription: product.shortDescription, category: draft.category, price: product.price, salePrice: product.salePrice ?? null, stock: product.stock, colorOptions: product.colorOptions, variants: product.variants, images: product.images, isActive: product.isActive, isFeatured: product.isFeatured, isBestSeller: product.isBestSeller };
    if (!this.adminApi) { this.products.set(draft.id ? this.products().map((item) => item._id === draft.id ? product : item) : [product, ...this.products()]); this.productDraft = null; this.persistDemo('تم حفظ المنتج'); return; }
    this.isSaving.set(true);
    this.adminApi.saveProduct(payload, draft.id).subscribe({
      next: ({ data }) => { this.products.set(draft.id ? this.products().map((item) => item._id === draft.id ? data : item) : [data, ...this.products()]); this.releaseDraftImagePreviews(draft); this.productDraft = null; this.successMessage.set(draft.id ? 'تم تعديل المنتج بنجاح.' : 'تمت إضافة المنتج بنجاح.'); this.isSaving.set(false); this.loadProducts(); this.storefront.reloadCatalog(); },
      error: () => { this.errorMessage.set('تعذر حفظ المنتج. راجع البيانات وحاول مرة أخرى.'); this.isSaving.set(false); },
    });
  }

  newCategory(): void {
    this.categoryDraft = { slug: '', nameAr: '', nameEn: '', descriptionAr: '', descriptionEn: '', image: '', imagePublicId: '', imagePreviewUrl: '', sortOrder: this.categories().length + 1, isActive: true };
  }

  editCategory(category: AdminCategory): void {
    this.categoryDraft = {
      id: category._id, slug: category.slug, nameAr: category.name.ar, nameEn: category.name.en,
      descriptionAr: category.description.ar, descriptionEn: category.description.en,
      image: category.image, imagePublicId: category.imagePublicId, imagePreviewUrl: category.image, sortOrder: category.sortOrder, isActive: category.isActive,
    };
  }

  saveCategory(): void {
    const draft = this.categoryDraft;
    if (!draft) return;
    if (draft.isImageUploading || this.imageUploadsInProgress() > 0) {
      this.errorMessage.set('انتظري حتى يكتمل رفع الصورة قبل حفظ القسم.');
      return;
    }
    if (!draft.slug.trim() || !draft.nameAr.trim() || !draft.nameEn.trim()) {
      this.errorMessage.set('اكتب اسم القسم بالعربي والإنجليزي والـSlug.');
      return;
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(draft.slug.trim())) {
      this.errorMessage.set('الـSlug لازم يكون بحروف إنجليزي صغيرة وأرقام، وبينهم شرطة لو محتاجة.');
      return;
    }
    const category: AdminCategory = {
      _id: draft.id ?? this.newId('category'),
      slug: draft.slug.trim(),
      name: { ar: draft.nameAr.trim(), en: draft.nameEn.trim() },
      description: { ar: draft.descriptionAr.trim(), en: draft.descriptionEn.trim() },
      image: draft.image.trim(), imagePublicId: draft.imagePublicId,
      sortOrder: Number(draft.sortOrder) || 0,
      isActive: draft.isActive,
    };
    const isDemoRecord = draft.id?.startsWith('demo-') === true;
    if (!this.adminApi || isDemoRecord) { this.revokeCategoryImagePreview(draft); this.categories.set(draft.id ? this.categories().map((item) => item._id === draft.id ? category : item) : [...this.categories(), category]); this.categoryDraft = null; this.persistDemo('تم حفظ التصنيف'); return; }
    this.isSaving.set(true);
    const payload = { slug: category.slug, name: category.name, description: category.description, image: category.image, imagePublicId: category.imagePublicId || undefined, sortOrder: category.sortOrder, isActive: category.isActive };
    this.adminApi.saveCategory(payload, draft.id).subscribe({
      next: ({ data }) => { this.revokeCategoryImagePreview(draft); this.categories.set(draft.id ? this.categories().map((item) => item._id === draft.id ? data : item) : [data, ...this.categories()]); this.categoryDraft = null; this.successMessage.set(draft.id ? 'تم تعديل التصنيف بنجاح.' : 'تمت إضافة التصنيف بنجاح.'); this.isSaving.set(false); },
      error: () => { this.errorMessage.set('تعذر حفظ التصنيف. قد يكون الـ Slug مستخدمًا بالفعل.'); this.isSaving.set(false); },
    });
  }

  hideProduct(product: AdminProduct): void {
    if (this.adminApi && !product._id.startsWith('demo-')) { this.toggleProduct(product); return; }
    this.products.set(this.products().map((item) => item._id === product._id ? { ...item, isActive: false } : item));
    this.persistDemo('المنتج بقى مخفي من المتجر.');
  }

  toggleProduct(product: AdminProduct): void {
    const isActive = !product.isActive;
    if (!this.adminApi || product._id.startsWith('demo-')) { this.products.set(this.products().map((item) => item._id === product._id ? { ...item, isActive } : item)); this.persistDemo(isActive ? 'تم تفعيل المنتج.' : 'تم إخفاء المنتج.'); return; }
    this.adminApi.setProductActive(product._id, isActive).subscribe({ next: ({ data }) => { this.products.set(this.products().map((item) => item._id === product._id ? data : item)); this.successMessage.set(isActive ? 'تم تفعيل المنتج.' : 'تم إخفاء المنتج مع الاحتفاظ به.'); this.loadProducts(); }, error: () => this.errorMessage.set('تعذر تغيير حالة المنتج.') });
  }

  deleteProduct(product: AdminProduct): void {
    this.productToDelete.set(product);
  }

  confirmDelete(): void {
    const product = this.productToDelete();
    if (!product) return;
    if (!this.adminApi || product._id.startsWith('demo-')) {
      this.products.set(this.products().filter((item) => item._id !== product._id));
      this.productToDelete.set(null);
      this.persistDemo('المنتج اتمسح.');
      return;
    }

    this.isSaving.set(true);
    this.adminApi.deactivateProduct(product._id).subscribe({
      next: () => {
        this.products.set(this.products().filter((item) => item._id !== product._id));
        this.productToDelete.set(null);
        this.successMessage.set('تم حذف المنتج بنجاح.');
        this.isSaving.set(false);
        this.loadProducts();
        this.storefront.reloadCatalog();
      },
      error: () => {
        this.errorMessage.set('تعذر حذف المنتج.');
        this.isSaving.set(false);
      },
    });
  }

  cancelDelete(): void {
    this.productToDelete.set(null);
  }

  toggleCategory(category: AdminCategory): void {
    const isActive = !category.isActive;
    if (!this.adminApi || category._id.startsWith('demo-')) { this.categories.set(this.categories().map((item) => item._id === category._id ? { ...item, isActive } : item)); this.persistDemo(isActive ? 'تم تفعيل التصنيف.' : 'تم إخفاء التصنيف.'); return; }
    this.adminApi.setCategoryActive(category._id, isActive).subscribe({
      next: ({ data }) => { this.categories.set(this.categories().map((item) => item._id === category._id ? data : item)); this.successMessage.set(isActive ? 'تم تفعيل التصنيف.' : 'تم إخفاء التصنيف.'); },
      error: () => this.errorMessage.set('لا يمكن إخفاء تصنيف مرتبط بمنتجات. انقل المنتجات أولًا للحفاظ على البيانات.'),
    });
  }

  deleteCategory(category: AdminCategory): void {
    this.clearFeedback();
    this.categoryToDelete.set(category);
  }

  confirmCategoryDelete(): void {
    const category = this.categoryToDelete();
    if (!category) return;
    if (!this.adminApi || category._id.startsWith('demo-')) {
      this.categories.set(this.categories().filter((item) => item._id !== category._id));
      this.categoryToDelete.set(null);
      this.persistDemo('تم حذف القسم.');
      return;
    }
    this.isSaving.set(true);
    this.adminApi.deleteCategory(category._id).subscribe({
      next: () => {
        this.categories.set(this.categories().filter((item) => item._id !== category._id));
        this.categoryToDelete.set(null);
        if (this.categoryDraft?.id === category._id) this.categoryDraft = null;
        this.successMessage.set('تم حذف القسم نهائيًا.');
        this.isSaving.set(false);
      },
      error: () => {
        this.errorMessage.set('لا يمكن حذف قسم مرتبط بمنتجات. انقلي المنتجات إلى قسم آخر أولًا ثم حاولي مرة أخرى.');
        this.categoryToDelete.set(null);
        this.isSaving.set(false);
      },
    });
  }

  cancelCategoryDelete(): void {
    if (!this.isSaving()) this.categoryToDelete.set(null);
  }

  saveOrderStatus(order: AdminOrder, status: string): void {
    if (!this.orderStatuses.includes(status)) return;
    if (!this.adminApi || order._id.startsWith('demo-')) {
      this.orders.set(this.orders().map((item) => item._id === order._id ? { ...item, orderStatus: status } : item));
      this.persistDemo('تم تحديث حالة الطلب.');
      return;
    }
    this.adminApi.updateOrder(order._id, { orderStatus: status }).subscribe({ next: ({ data }) => { this.orders.set(this.orders().map((item) => item._id === order._id ? data : item)); this.successMessage.set('تم تحديث حالة الطلب.'); this.loadDashboard(); }, error: () => { this.errorMessage.set('لا يمكن تغيير حالة الطلب النهائية.'); this.loadOrders(); } });
  }

  savePaymentStatus(order: AdminOrder, status: string): void {
    if (!this.paymentStatuses.includes(status)) return;
    if (!this.adminApi || order._id.startsWith('demo-')) {
      this.orders.set(this.orders().map((item) => item._id === order._id ? { ...item, paymentStatus: status } : item));
      this.persistDemo('تم تحديث حالة الدفع.');
      return;
    }
    this.adminApi.updateOrder(order._id, { paymentStatus: status }).subscribe({ next: ({ data }) => { this.orders.set(this.orders().map((item) => item._id === order._id ? data : item)); this.successMessage.set('تم تحديث حالة الدفع.'); this.loadDashboard(); }, error: () => { this.errorMessage.set('تعذر تحديث حالة الدفع.'); this.loadOrders(); } });
  }

  saveSettings(): void {
    const draft = this.settingsDraft;
    if (!draft) return;
    if (this.imageUploadsInProgress() > 0) {
      this.errorMessage.set('انتظري حتى يكتمل رفع الصور قبل الحفظ.');
      return;
    }
    if (!draft.storeName.trim() || !draft.currency.trim() || Number(draft.deliveryFee) < 0) {
      this.errorMessage.set('راجع اسم المتجر والعملة ومصاريف التوصيل.');
      return;
    }
    const nextSettings: AdminSettings = {
      ...draft,
      storeName: draft.storeName.trim(),
      freeShippingThreshold: draft.freeShippingThreshold == null ? null : Number(draft.freeShippingThreshold),
      deliveryFee: Number(draft.deliveryFee),
    };
    if (!this.adminApi) {
      this.settings.set(nextSettings);
      this.settingsDraft = this.cloneSettings(this.settings());
      this.persistDemo('التعديلات اتحفظت بنجاح.');
      return;
    }
    this.isSaving.set(true);
    this.adminApi.saveSettings(nextSettings).subscribe({
      next: ({ data }) => {
        this.settings.set(this.withShippingDefaults(data));
        this.settingsDraft = this.cloneSettings(this.settings());
        this.clearSettingsImagePreviews();
        this.successMessage.set('تم حفظ إعدادات المتجر بنجاح.');
        this.storefront.loadStoreSettings();
        this.isSaving.set(false);
      },
      error: () => {
        this.errorMessage.set('تعذر حفظ إعدادات المتجر. لم يتم حذف الصور القديمة.');
        this.isSaving.set(false);
      },
    });
  }

  newShippingZone(): void {
    this.shippingZoneDraft = { nameAr: '', nameEn: '', governorates: '', areas: '', price: 0, estimatedDaysMin: 2, estimatedDaysMax: 5, isActive: true };
  }

  editShippingZone(zone: AdminShippingZone): void {
    this.shippingZoneDraft = { id: zone._id, nameAr: zone.name.ar, nameEn: zone.name.en, governorates: zone.governorates.join(', '), areas: (zone.areas ?? []).join(', '), price: zone.price, estimatedDaysMin: zone.estimatedDaysMin, estimatedDaysMax: zone.estimatedDaysMax, isActive: zone.isActive };
  }

  saveShippingZone(): void {
    const draft = this.shippingZoneDraft;
    if (!draft || !this.settingsDraft) return;
    const governorates = this.splitList(draft.governorates);
    const areas = this.splitList(draft.areas);
    if (!draft.nameAr.trim() || !draft.nameEn.trim() || !governorates.length || (areas.length > 0 && governorates.length !== 1) || draft.price < 0 || draft.estimatedDaysMax < draft.estimatedDaysMin) {
      this.errorMessage.set('راجع اسم المنطقة والمحافظات والسعر ومدة التوصيل.');
      return;
    }
    const zone: AdminShippingZone = { _id: draft.id, name: { ar: draft.nameAr.trim(), en: draft.nameEn.trim() }, governorates, areas, price: Number(draft.price), estimatedDaysMin: Number(draft.estimatedDaysMin), estimatedDaysMax: Number(draft.estimatedDaysMax), isActive: draft.isActive };
    const zones = draft.id ? this.settingsDraft.shipping.zones.map((item) => item._id === draft.id ? zone : item) : [...this.settingsDraft.shipping.zones, zone];
    this.settingsDraft = { ...this.settingsDraft, shipping: { ...this.settingsDraft.shipping, zones } };
    this.shippingZoneDraft = null;
    this.saveShippingSettings('تم حفظ منطقة الشحن بنجاح.');
  }

  deleteShippingZone(zone: AdminShippingZone): void {
    if (!this.settingsDraft) return;
    this.settingsDraft = { ...this.settingsDraft, shipping: { ...this.settingsDraft.shipping, zones: this.settingsDraft.shipping.zones.filter((item) => item._id !== zone._id) } };
    this.saveShippingSettings('تم حذف منطقة الشحن بنجاح.');
  }

  toggleShippingZone(zone: AdminShippingZone): void {
    if (!this.settingsDraft) return;
    const zones = this.settingsDraft.shipping.zones.map((item) =>
      item._id === zone._id ? { ...item, isActive: !item.isActive } : item,
    );
    this.settingsDraft = { ...this.settingsDraft, shipping: { ...this.settingsDraft.shipping, zones } };
    this.saveShippingSettings(zone.isActive ? 'تم تعطيل منطقة الشحن.' : 'تم تفعيل منطقة الشحن.');
  }

  saveShippingSettings(successMessage = 'تم حفظ إعدادات الشحن بنجاح.'): void {
    if (!this.settingsDraft) return;
    if (!this.adminApi) {
      this.settings.set(this.settingsDraft);
      this.persistDemo('تم حفظ إعدادات الشحن على الجهاز.');
      return;
    }
    this.isSaving.set(true);
    this.adminApi.saveSettings(this.settingsDraft).subscribe({
      next: ({ data }) => { this.settings.set(this.withShippingDefaults(data)); this.settingsDraft = this.cloneSettings(this.settings()); this.successMessage.set(successMessage); this.isSaving.set(false); this.storefront.loadStoreSettings(); },
      error: () => { this.errorMessage.set('تعذر حفظ إعدادات الشحن.'); this.isSaving.set(false); },
    });
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      new: 'جديد', confirmed: 'اتأكد', preparing: 'بيتجهز',
      shipped: 'خرج للشحن', completed: 'اتسلّم', cancelled: 'اتلغى',
    };
    return labels[status] ?? status;
  }

  paymentLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'مستني الدفع', awaiting_verification: 'مستني مراجعة التحويل',
      paid: 'تم الدفع', rejected: 'التحويل مرفوض',
    };
    return labels[status] ?? status;
  }

  paymentMethodLabel(method: string): string {
    return method.toLowerCase() === 'cod' ? 'الدفع عند الاستلام' : method;
  }

  logout(): void {
    if (!this.adminApi) {
      void this.router.navigate(['/login']);
      return;
    }
    this.adminApi.logout().subscribe({
      next: () => void this.router.navigate(['/login']),
      error: () => void this.router.navigate(['/login']),
    });
  }

  private loadDemoData(): void {
    const defaults = createDemoData();
    try {
      const stored = localStorage.getItem(DEMO_STORAGE_KEY);
      if (!stored) {
        this.setDemoData(defaults);
        return;
      }
      const parsed: unknown = JSON.parse(stored);
      if (!this.isDemoData(parsed)) throw new Error('Invalid saved demo data');
      this.setDemoData(parsed);
    } catch {
      this.setDemoData(defaults);
      this.errorMessage.set('بيانات الديمو المحفوظة مش مقروءة، رجّعنا بيانات البداية. تقدر تكمّل عادي.');
    }
  }

  private isDemoData(value: unknown): value is ReturnType<typeof createDemoData> {
    if (!value || typeof value !== 'object') return false;
    const data = value as { products?: unknown; categories?: unknown; orders?: unknown; settings?: unknown };
    return Array.isArray(data.products) && Array.isArray(data.categories) && Array.isArray(data.orders)
      && !!data.settings && typeof data.settings === 'object';
  }

  private setDemoData(data: ReturnType<typeof createDemoData>): void {
    this.products.set(data.products);
    this.categories.set(data.categories);
    this.orders.set(data.orders);
    this.customers.set(summarizeDemoCustomers(data.orders));
    this.settings.set(data.settings);
    this.settingsDraft = this.cloneSettings(data.settings);
  }

  private persistDemo(successMessage: string): void {
    this.isSaving.set(true);
    this.clearFeedback();
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({
        products: this.products(),
        categories: this.categories(),
        orders: this.orders(),
        settings: this.settings(),
      }));
      // Local demo saves never reach the server; say so on every success message.
      this.successMessage.set(`${successMessage} (محفوظ على الجهاز فقط في وضع الديمو، مش على الخادم)`);
    } catch {
      this.errorMessage.set('حصلت مشكلة وإحنا بنحفظ الديمو على الجهاز. جربي تاني.');
    } finally {
      this.isSaving.set(false);
    }
  }

  private cloneSettings(settings: AdminSettings): AdminSettings {
    const normalized = this.withShippingDefaults(settings);
    return {
      ...normalized,
      hero: { ...normalized.hero },
      promoBanner: { ...normalized.promoBanner },
      featuredCollection: { ...normalized.featuredCollection },
      announcement: { ...normalized.announcement },
      contact: { ...normalized.contact },
      social: { ...normalized.social },
      instapay: { ...normalized.instapay, instructions: { ...normalized.instapay.instructions } },
      shipping: {
        ...normalized.shipping,
        freeShipping: { ...normalized.shipping.freeShipping },
        zones: normalized.shipping.zones.map((zone) => ({ ...zone, name: { ...zone.name }, governorates: [...zone.governorates], areas: [...(zone.areas ?? [])] })),
      },
    };
  }

  private withShippingDefaults(settings: AdminSettings): AdminSettings {
    return {
      ...settings,
      logoPublicId: settings.logoPublicId ?? '',
      hero: {
        posterUrl: settings.hero?.posterUrl ?? '',
        posterPublicId: settings.hero?.posterPublicId ?? '',
      },
      promoBanner: {
        image: settings.promoBanner?.image ?? '',
        imagePublicId: settings.promoBanner?.imagePublicId ?? '',
        isActive: settings.promoBanner?.isActive ?? false,
      },
      featuredCollection: {
        image: settings.featuredCollection?.image ?? '',
        imagePublicId: settings.featuredCollection?.imagePublicId ?? '',
      },
      instapay: settings.instapay ?? { enabled: false, identifier: '', accountName: '', instructions: { ar: '', en: '' } },
      shipping: settings.shipping ?? { enabled: true, freeShipping: { enabled: settings.freeShippingThreshold != null, threshold: settings.freeShippingThreshold ?? 0 }, zones: [] },
    };
  }

  private newId(type: string): string {
    return `demo-${type}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }

  productStock(product: AdminProduct): number {
    return product.variants?.length
      ? product.variants.reduce((total, variant) => total + variant.stock, 0)
      : product.stock;
  }

  productNames(products: AdminProduct[]): string {
    return products.slice(0, 3).map((product) => product.name.ar).join('، ');
  }

  private removeDraftImages(draft: ProductDraft, imageIds: string[]): void {
    const ids = new Set(imageIds);
    draft.images = draft.images.filter((image) => !ids.has(image.id));
  }

  private releaseDraftImagePreviews(draft: ProductDraft | null): void {
    if (draft) this.revokeImagePreviews(draft.images);
  }

  private revokeImagePreviews(images: ProductImageDraft[]): void {
    images.forEach((image) => this.revokeImagePreview(image));
  }

  private revokeImagePreview(image: ProductImageDraft): void {
    if (image.previewUrl.startsWith('blob:')) URL.revokeObjectURL(image.previewUrl);
  }

  private isSupportedImage(file: File): boolean {
    // Accept all files — the server handles type/size validation
    return true;
  }

  private imageUploadError(error: unknown, fallback: string): string {
    const apiError = (error as { error?: { error?: { code?: unknown } } })?.error?.error;
    if (apiError?.code === 'MEDIA_UNAVAILABLE') {
      return 'خدمة رفع الصور غير مُعدّة على الخادم. أضيفي إعدادات Cloudinary الثلاثة ثم أعيدي تشغيل الخادم.';
    }
    if (apiError?.code === 'MEDIA_UPLOAD_FAILED') {
      return 'تعذر الاتصال بـ Cloudinary لحفظ الصورة. تحققي من إعداداته ثم حاولي مرة أخرى.';
    }
    if (apiError?.code === 'UPLOAD_ERROR') {
      return 'حجم الصورة أكبر من الحد المسموح على الخادم.';
    }
    if (apiError?.code === 'BAD_REQUEST') {
      return 'صيغة الصورة غير مدعومة. استخدمي JPG أو PNG أو WEBP أو GIF أو AVIF أو HEIC/HEIF أو BMP أو TIFF.';
    }
    if (apiError?.code === 'FORBIDDEN') {
      return 'تم رفض طلب الرفع من الخادم. حدّثي الصفحة ثم سجّلي الدخول مرة أخرى.';
    }
    if (apiError?.code === 'UNAUTHORIZED') {
      return 'انتهت جلسة الإدارة. سجّلي الدخول مرة أخرى ثم أعيدي الرفع.';
    }
    return fallback;
  }

  private revokeCategoryImagePreview(draft: CategoryDraft | null): void {
    if (draft?.imagePreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(draft.imagePreviewUrl);
  }

  private readSettingsImage(settings: AdminSettings | null, target: SettingsImageTarget): { url: string; publicId?: string } {
    if (!settings) return { url: '' };
    if (target === 'logo') return { url: settings.logoUrl, publicId: settings.logoPublicId };
    if (target === 'heroPoster') return { url: settings.hero.posterUrl, publicId: settings.hero.posterPublicId };
    if (target === 'promoBanner') return { url: settings.promoBanner.image, publicId: settings.promoBanner.imagePublicId };
    return { url: settings.featuredCollection.image, publicId: settings.featuredCollection.imagePublicId };
  }

  private writeSettingsImage(settings: AdminSettings, target: SettingsImageTarget, url: string, publicId: string): void {
    if (target === 'logo') {
      settings.logoUrl = url;
      settings.logoPublicId = publicId;
    } else if (target === 'heroPoster') {
      settings.hero.posterUrl = url;
      settings.hero.posterPublicId = publicId;
    } else if (target === 'promoBanner') {
      settings.promoBanner.image = url;
      settings.promoBanner.imagePublicId = publicId;
    } else {
      settings.featuredCollection.image = url;
      settings.featuredCollection.imagePublicId = publicId;
    }
  }

  private revokeSettingsImagePreview(target: SettingsImageTarget): void {
    const preview = this.settingsImagePreviews[target];
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    delete this.settingsImagePreviews[target];
  }

  private clearSettingsImagePreviews(): void {
    (['logo', 'heroPoster', 'promoBanner', 'featuredCollection'] as SettingsImageTarget[])
      .forEach((target) => this.revokeSettingsImagePreview(target));
  }

  private parseVariants(value: string): AdminProductVariant[] | null {
    const rows = value.split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
    const variants: AdminProductVariant[] = [];

    for (const row of rows) {
      const [ar, en, hexValue, stockValue, ...extra] = row.split('|').map((part) => part.trim());
      const stock = Number(stockValue);
      if (extra.length || !ar || !en || !Number.isInteger(stock) || stock < 0) return null;
      if (hexValue && !/^#[0-9a-fA-F]{6}$/.test(hexValue)) return null;
      variants.push({ color: { name: { ar, en }, hex: hexValue || undefined }, stock });
    }

    const keys = variants.map((variant) =>
      (variant.color.hex ?? `${variant.color.name.ar}|${variant.color.name.en}`).toLowerCase(),
    );
    return new Set(keys).size === keys.length ? variants : null;
  }

  private serializeVariants(variants: AdminProductVariant[]): string {
    return variants.map((variant) => [
      variant.color.name.ar,
      variant.color.name.en,
      variant.color.hex ?? '',
      variant.stock,
    ].join(' | ')).join('\n');
  }

  private splitList(value: string): string[] {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }

  private clearFeedback(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
  }
}
