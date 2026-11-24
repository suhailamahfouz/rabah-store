import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface CreateOrderRequest {
  idempotencyKey: string;
  customer: {
    fullName: string;
    phone: string;
    governorate: string;
    city: string;
    address: string;
  };
  items: Array<{
    productSlug: string;
    quantity: number;
    note?: string;
    color?: string;
    variantId?: string;
  }>;
  paymentMethod: 'cod' | 'instapay';
  currency: string;
}

export interface UploadProofResponse {
  success: true;
  data: {
    orderNumber: string;
    paymentStatus: string;
    proof: {
      id: string;
      size: number;
      mime: string;
      uploadedAt: string;
    };
  };
}

export interface ShippingQuote {
  fee: number;
  zoneId?: string;
  zoneName?: { ar: string; en: string };
  estimatedDaysMin?: number;
  estimatedDaysMax?: number;
  isFree: boolean;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  currency: string;
  subtotal: number;
  shippingFee: number;
  shippingGovernorate: string;
  shippingArea: string;
  deliveryEstimate?: { min?: number; max?: number };
  total: number;
  createdAt: string;
  /** Present only immediately after checkout; never persisted in browser storage. */
  accessToken?: string;
}

export interface CustomerOrderSummary extends OrderSummary {
  items: Array<{
    name: { ar: string; en: string };
    image: string;
    note?: string;
    color?: { ar: string; en: string };
    quantity: number;
    lineTotal: number;
  }>;
}

export interface OrderTrackingEvent {
  kind: 'order' | 'payment';
  status: string;
  occurredAt: string;
}

/** Deliberately privacy-safe public tracking response. */
export interface TrackedOrder {
  orderNumber: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  shippingStatus: 'pending' | 'preparing' | 'in_transit' | 'delivered' | 'cancelled';
  estimatedDelivery?: { from: string; to: string };
  timeline: OrderTrackingEvent[];
}

export interface TrackOrderRequest {
  orderNumber: string;
  phone?: string;
  accessCode?: string;
}

export interface OrderListResponse {
  success: true;
  data: CustomerOrderSummary[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface CreateOrderResponse {
  success: true;
  data: OrderSummary;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly headers = new HttpHeaders({ 'X-Requested-With': 'XMLHttpRequest' });

  createOrder(order: CreateOrderRequest): Observable<CreateOrderResponse> {
    return this.http.post<CreateOrderResponse>('/api/orders', order, {
      headers: this.headers,
      withCredentials: true,
    });
  }

  shippingQuote(subtotal: number, governorate: string, area?: string): Observable<{ success: true; data: ShippingQuote }> {
    return this.http.post<{ success: true; data: ShippingQuote }>('/api/orders/shipping-quote', { subtotal, governorate, ...(area ? { area } : {}) }, {
      headers: this.headers,
      withCredentials: true,
    });
  }

  myOrders(page = 1, limit = 20): Observable<OrderListResponse> {
    return this.http.get<OrderListResponse>(`/api/orders/mine?page=${page}&limit=${limit}`, { withCredentials: true });
  }

  trackOrder(request: TrackOrderRequest): Observable<{ success: true; data: TrackedOrder }> {
    return this.http.post<{ success: true; data: TrackedOrder }>('/api/orders/track', request, {
      headers: this.headers,
      withCredentials: true,
    });
  }

  /**
   * Upload the InstaPay transfer screenshot for an existing order.
   * The order's high-entropy accessToken is required to prove ownership.
   * Payment status becomes `awaiting_verification` — never marked paid.
   */
  uploadProof(orderNumber: string, accessToken: string, proof: Blob, transferReference?: string): Observable<UploadProofResponse> {
    const formData = new FormData();
    formData.append('proof', proof, 'proof.jpg');
    if (transferReference) formData.append('transferReference', transferReference);
    formData.append('accessToken', accessToken);
    return this.http.post<UploadProofResponse>(`/api/orders/${encodeURIComponent(orderNumber)}/proof`, formData, {
      headers: this.headers,
      withCredentials: true,
    });
  }
}
