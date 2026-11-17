import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  username?: string;
}

export type AccountRole = 'admin' | 'customer';

export interface AuthResponse {
  success: true;
  role: AccountRole;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  readonly user = signal<AuthUser | null>(null);
  readonly role = signal<AccountRole | null>(null);

  constructor() {
    this.session().subscribe({ error: () => undefined });
  }

  session(): Observable<AuthResponse> {
    return this.http.get<AuthResponse>('/api/auth/session', { withCredentials: true }).pipe(
      tap(({ user, role }) => { this.user.set(user); this.role.set(role); }),
    );
  }

  register(name: string, identifier: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(
        '/api/auth/register',
        { name, identifier, password },
        { headers: this.requestHeaders, withCredentials: true },
      )
      .pipe(tap(({ user, role }) => { this.user.set(user); this.role.set(role); }));
  }

  login(identifier: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(
        '/api/auth/login',
        { identifier, password },
        { headers: this.requestHeaders, withCredentials: true },
      )
      .pipe(tap(({ user, role }) => { this.user.set(user); this.role.set(role); }));
  }

  logout(): Observable<{ success: true }> {
    return this.http.post<{ success: true }>('/api/auth/logout', {}, { headers: this.requestHeaders, withCredentials: true }).pipe(
      tap({
        next: () => this.clearSession(),
        error: () => this.clearSession(),
      }),
    );
  }

  private clearSession(): void {
    this.user.set(null);
    this.role.set(null);
  }

  private get requestHeaders(): HttpHeaders {
    return new HttpHeaders({ 'X-Requested-With': 'XMLHttpRequest' });
  }
}
