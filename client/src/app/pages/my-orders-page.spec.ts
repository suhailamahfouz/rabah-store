import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { MyOrdersPageComponent } from './my-orders-page';
import { OrderService } from '../services/order.service';
import { StoreService } from '../services/store.service';

describe('MyOrdersPageComponent', () => {
  const order = {
    id: 'order-1', orderNumber: 'RBAH-2026-00001', status: 'new', paymentStatus: 'pending', paymentMethod: 'cod', currency: 'EGP',
    subtotal: 100, shippingFee: 25, total: 125, createdAt: '2026-01-01T00:00:00.000Z',
    items: [{ name: { ar: 'منتج', en: 'Product' }, image: '', quantity: 1, lineTotal: 100 }],
  };

  afterEach(() => TestBed.resetTestingModule());

  it('renders customer-scoped order history after a successful response', () => {
    TestBed.configureTestingModule({
      imports: [MyOrdersPageComponent], providers: [provideRouter([]),
        { provide: StoreService, useValue: { lang: signal<'en' | 'ar'>('en') } },
        { provide: OrderService, useValue: { myOrders: () => of({ success: true, data: [order] }) } },
      ],
    });
    const component = TestBed.createComponent(MyOrdersPageComponent).componentInstance;
    expect(component.loading()).toBe(false);
    expect(component.orders()).toEqual([order]);
    expect(component.statusLabel('new')).toBe('new');
  });

  it('shows the API error state without retaining old orders', () => {
    TestBed.configureTestingModule({
      imports: [MyOrdersPageComponent], providers: [provideRouter([]),
        { provide: StoreService, useValue: { lang: signal<'en' | 'ar'>('en') } },
        { provide: OrderService, useValue: { myOrders: () => throwError(() => ({ error: { error: { message: 'Session expired' } } })) } },
      ],
    });
    const component = TestBed.createComponent(MyOrdersPageComponent).componentInstance;
    expect(component.loading()).toBe(false);
    expect(component.orders()).toEqual([]);
    expect(component.error()).toBe('Session expired');
  });
});
