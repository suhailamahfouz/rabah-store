import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let http: HttpTestingController;
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AuthService);
    http.expectOne('/api/auth/session').flush({
      success: true, role: 'customer', user: { id: 'customer-1', name: 'Customer' },
    });
  });

  afterEach(() => http.verify());

  it('logs in with credentialed, CSRF-marked requests and updates the client session', () => {
    service.login('admin@example.test', 'correct password').subscribe();
    const request = http.expectOne('/api/auth/login');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.get('X-Requested-With')).toBe('XMLHttpRequest');
    expect(request.request.body).toEqual({ identifier: 'admin@example.test', password: 'correct password' });
    request.flush({ success: true, role: 'admin', user: { id: 'admin-1', name: 'Admin', email: 'admin@example.test' } });

    expect(service.role()).toBe('admin');
    expect(service.user()?.id).toBe('admin-1');
  });

  it('clears local session state when logout fails', () => {
    service.logout().subscribe({ error: () => undefined });
    http.expectOne('/api/auth/logout').flush({ success: false }, { status: 401, statusText: 'Unauthorized' });
    expect(service.user()).toBeNull();
    expect(service.role()).toBeNull();
  });
});
