import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';
import { AdminService } from '../services/admin.service';
import { AuthService } from '../services/auth.service';
import { adminGuard } from './admin.guard';
import { customerGuard } from './customer.guard';

describe('route authorization guards', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('allows a verified admin and redirects an expired admin session', async () => {
    const adminApi = { session: () => of({ success: true, admin: { id: 'admin-1', name: 'Admin', email: 'admin@example.test' } }) };
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AdminService, useValue: adminApi }] });
    expect(await firstValueFrom(TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any) as any))).toBe(true);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AdminService, useValue: { session: () => throwError(() => new Error('expired')) } }],
    });
    const result = await firstValueFrom(TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any) as any));
    expect(TestBed.inject(Router).serializeUrl(result as any)).toBe('/login');
  });

  it('allows customers only and redirects guest or administrator sessions', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { session: () => of({ success: true, role: 'customer', user: { id: 'customer-1', name: 'Customer' } }) } }],
    });
    expect(await firstValueFrom(TestBed.runInInjectionContext(() => customerGuard({} as any, {} as any) as any))).toBe(true);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { session: () => of({ success: true, role: 'admin', user: { id: 'admin-1', name: 'Admin' } }) } }],
    });
    const result = await firstValueFrom(TestBed.runInInjectionContext(() => customerGuard({} as any, {} as any) as any));
    expect(TestBed.inject(Router).serializeUrl(result as any)).toBe('/login');
  });
});
