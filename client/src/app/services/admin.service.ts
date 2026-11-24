import { ProductColor } from '../data/product-colors';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
}

export interface AdminDashboardData {
  summary: {
    sales: number;
    orders: number;
    newOrders: number;
    pendingOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    products: number;
    categories: number;
    customers: number;
  };
  dailySales: AdminDashboardSalesPeriod;
  monthlySales: AdminDashboardSalesPeriod;
  latestOrders: Array<{
    orderNumber: string;
    customer: { fullName: string; phone: string };
    total: number;
    currency: string;
    orderStatus: string;
    paymentStatus: string;
    createdAt: string;
  }>;
}

export interface AdminDashboardSalesPeriod {
  current: number;
  previous: number;
  /** Null when the preceding period contains no sales to compare against. */
  changePercent: number | null;
}

export interface AdminOrderQuery { search?: string; status?: string; dateFrom?: string; dateTo?: string; paymentMethod?: string; }

export interface AdminCategory {
  _id: string;
  slug: string;
  name: { ar: string; en: string };
  description: { ar: string; en: string };
  image: string;
  imagePublicId?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface AdminProduct {
  colorOptions?: ProductColor[];
  _id: string;
  sku: string;
  slug: string;
  name: { ar: string; en: string };
  description: { ar: string; en: string };
  shortDescription: { ar: string; en: string };
  category: string | { _id: string; slug: string; name: { ar: string; en: string } };
  price: number;
  salePrice?: number;
  stock: number;
  variants: AdminProductVariant[];
  images: AdminProductImage[];
  isActive: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  createdAt?: string;
}

export interface AdminProductVariant {
  _id?: string;
  color: {
    name: { ar: string; en: string };
    hex?: string;
  };
  stock: number;
}

export interface AdminProductImage {
  url: string;
  publicId?: string;
  alt: string;
}

export interface AdminProductPayload {
  colorOptions?: ProductColor[];
  sku: string;
  slug: string;
  name: { ar: string; en: string };
  description: { ar: string; en: string };
  shortDescription: { ar: string; en: string };
  category: string;
  price: number;
  salePrice: number | null;
  stock: number;
  variants: AdminProductVariant[];
  images: AdminProductImage[];
  isActive: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
}

export interface AdminProductQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: 'all' | 'active' | 'inactive';
  minPrice?: number | null;
  maxPrice?: number | null;
}

export interface AdminPagination { page: number; limit: number; total: number; pages: number; }

export type AdminCategoryPayload = Pick<AdminCategory, 'slug' | 'name' | 'description' | 'image' | 'imagePublicId' | 'sortOrder' | 'isActive'>;

export interface AdminOrder {
  _id: string;
  orderNumber: string;
  customer: {
    fullName: string;
    phone: string;
    governorate: string;
    city: string;
    address: string;
    notes: string;
  };
  items: Array<{ name: { ar: string; en: string }; sku: string; quantity: number; unitPrice: number; color?: { ar: string; en: string }; note?: string }>;
  subtotal: number;
  shippingFee: number;
  total: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
  /** Present once a customer uploaded an InstaPay transfer screenshot. */
  paymentProof?: { transferReference?: string; uploadedAt?: string; available: boolean };
}

/** Safe fields returned by the protected admin customer directory. */
export interface AdminCustomer {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
  latestOrderAt?: string;
}

export interface AdminCustomerOrder {
  _id: string;
  orderNumber: string;
  items: Array<{
    name: { ar?: string; en?: string };
    color?: { ar: string; en: string }; note?: string;
    sku: string;
    quantity: number;
    unitPrice: number;
  }>;
  total: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
}

export interface AdminCustomerDetail {
  customer: Pick<AdminCustomer, '_id' | 'name' | 'email' | 'phone' | 'createdAt'>;
  summary: Pick<AdminCustomer, 'orderCount' | 'totalSpent' | 'latestOrderAt'>;
  orders: AdminCustomerOrder[];
}

export interface AdminCustomerQuery {
  name?: string;
  email?: string;
  phone?: string;
  page?: number;
  limit?: number;
}

export interface AdminSettings {
  storeName: string;
  logoUrl: string;
  logoPublicId?: string;
  hero: { posterUrl: string; posterPublicId?: string };
  promoBanner: { image: string; imagePublicId?: string; isActive: boolean };
  featuredCollection: { image: string; imagePublicId?: string };
  currency: string;
  deliveryFee: number;
  freeShippingThreshold?: number | null;
  announcement: { ar: string; en: string; isActive: boolean };
  contact: { phone: string; whatsapp: string; email: string };
  social: { instagram: string; facebook: string; tiktok: string };
  instapay: { enabled: boolean; identifier: string; accountName: string; instructions: { ar: string; en: string } };
  shipping: AdminShippingSettings;
}

export interface AdminShippingZone {
  _id?: string;
  name: { ar: string; en: string };
  governorates: string[];
  areas: string[];
  price: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  isActive: boolean;
}

export interface AdminShippingSettings {
  enabled: boolean;
  freeShipping: { enabled: boolean; threshold: number };
  zones: AdminShippingZone[];
}

export type AdminImageUploadScope = 'products' | 'categories' | 'branding' | 'banners';

export interface AdminUploadedImage {
  url: string;
  publicId: string;
}

interface AdminSessionResponse {
  success: true;
  admin: AdminUser;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly headers = new HttpHeaders({ 'X-Requested-With': 'XMLHttpRequest' });

  session(): Observable<AdminSessionResponse> {
    return this.http.get<AdminSessionResponse>('/api/admin/session', { withCredentials: true });
  }

  dashboard(): Observable<{ success: true; data: AdminDashboardData }> {
    return this.http.get<{ success: true; data: AdminDashboardData }>(
      '/api/admin/dashboard',
      { withCredentials: true },
    );
  }

  products(query: AdminProductQuery = {}): Observable<{ success: true; data: AdminProduct[]; pagination: AdminPagination }> {
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== null && value !== '') params[key] = String(value);
    return this.http.get<{ success: true; data: AdminProduct[]; pagination: AdminPagination }>('/api/admin/products', { params, withCredentials: true });
  }

  saveProduct(product: AdminProductPayload, id?: string): Observable<{ success: true; data: AdminProduct }> {
    const options = { headers: this.headers, withCredentials: true };
    return id
      ? this.http.patch<{ success: true; data: AdminProduct }>(`/api/admin/products/${id}`, product, options)
      : this.http.post<{ success: true; data: AdminProduct }>('/api/admin/products', product, options);
  }

  uploadProductImages(files: File[]): Observable<{ success: true; data: AdminProductImage[] }> {
    const body = new FormData();
    for (const file of files) body.append('images', file, file.name);
    return this.http.post<{ success: true; data: AdminProductImage[] }>(
      '/api/admin/product-images',
      body,
      { headers: this.headers, withCredentials: true },
    );
  }

  uploadImage(file: File, scope: Exclude<AdminImageUploadScope, 'products'>): Observable<{ success: true; data: AdminUploadedImage[] }> {
    const body = new FormData();
    body.append('images', file, file.name);
    body.append('scope', scope);
    return this.http.post<{ success: true; data: AdminUploadedImage[] }>('/api/admin/images', body, {
      headers: this.headers,
      withCredentials: true,
    });
  }

  deactivateProduct(id: string): Observable<{ success: true }> {
    return this.http.delete<{ success: true }>(`/api/admin/products/${id}`, { headers: this.headers, withCredentials: true });
  }

  setProductActive(id: string, isActive: boolean): Observable<{ success: true; data: AdminProduct }> {
    return this.http.patch<{ success: true; data: AdminProduct }>(`/api/admin/products/${id}`, { isActive }, { headers: this.headers, withCredentials: true });
  }

  categories(): Observable<{ success: true; data: AdminCategory[] }> {
    return this.http.get<{ success: true; data: AdminCategory[] }>('/api/admin/categories', { withCredentials: true });
  }

  saveCategory(category: AdminCategoryPayload, id?: string): Observable<{ success: true; data: AdminCategory }> {
    const options = { headers: this.headers, withCredentials: true };
    return id
      ? this.http.patch<{ success: true; data: AdminCategory }>(`/api/admin/categories/${id}`, category, options)
      : this.http.post<{ success: true; data: AdminCategory }>('/api/admin/categories', category, options);
  }

  deleteCategory(id: string): Observable<{ success: true; data: { id: string } }> {
    return this.http.delete<{ success: true; data: { id: string } }>(`/api/admin/categories/${id}`, { headers: this.headers, withCredentials: true });
  }

  setCategoryActive(id: string, isActive: boolean): Observable<{ success: true; data: AdminCategory }> {
    return this.http.patch<{ success: true; data: AdminCategory }>(`/api/admin/categories/${id}`, { isActive }, { headers: this.headers, withCredentials: true });
  }

  orders(query: AdminOrderQuery = {}): Observable<{ success: true; data: AdminOrder[] }> {
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(query)) if (value) params[key] = value;
    return this.http.get<{ success: true; data: AdminOrder[] }>('/api/admin/orders', { params, withCredentials: true });
  }

  /** Admin-only URL of the stored InstaPay screenshot (opens with the admin session cookie). */
  paymentProofUrl(orderId: string): string {
    return `/api/admin/orders/${encodeURIComponent(orderId)}/proof`;
  }

  updateOrder(id: string, update: { orderStatus?: string; paymentStatus?: string }): Observable<{ success: true; data: AdminOrder }> {
    return this.http.patch<{ success: true; data: AdminOrder }>(`/api/admin/orders/${id}`, update, {
      headers: this.headers,
      withCredentials: true,
    });
  }

  customers(query: AdminCustomerQuery = {}): Observable<{ success: true; data: AdminCustomer[]; pagination: AdminPagination }> {
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== null && value !== '') params[key] = String(value);
    return this.http.get<{ success: true; data: AdminCustomer[]; pagination: AdminPagination }>('/api/admin/customers', {
      params,
      withCredentials: true,
    });
  }

  customer(id: string): Observable<{ success: true; data: AdminCustomerDetail }> {
    return this.http.get<{ success: true; data: AdminCustomerDetail }>(`/api/admin/customers/${id}`, {
      withCredentials: true,
    });
  }

  settings(): Observable<{ success: true; data: AdminSettings }> {
    return this.http.get<{ success: true; data: AdminSettings }>('/api/admin/settings', { withCredentials: true });
  }

  saveSettings(settings: AdminSettings): Observable<{ success: true; data: AdminSettings }> {
    return this.http.patch<{ success: true; data: AdminSettings }>('/api/admin/settings', settings, {
      headers: this.headers,
      withCredentials: true,
    });
  }

  shippingSettings(): Observable<{ success: true; data: AdminSettings }> {
    return this.settings();
  }

  logout(): Observable<{ success: true }> {
    return this.http.post<{ success: true }>(
      '/api/admin/logout',
      {},
      { headers: this.headers, withCredentials: true },
    );
  }
}
