import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { defer, map, retry, shareReplay, timeout, timer } from 'rxjs';

interface HealthResponse {
  success: boolean;
  status: string;
}

/**
 * Holds application bootstrap until the API is actually ready to serve data.
 * This is especially useful when the deployment provider has to wake a sleeping
 * backend: the visitor sees the splash screen instead of a half-loaded store.
 */
@Injectable({ providedIn: 'root' })
export class BackendReadinessService {
  private readonly http = inject(HttpClient);
  readonly ready = signal(false);

  private readonly readinessCheck = defer(() =>
    this.http.get<HealthResponse>('/api/health', { headers: { 'Cache-Control': 'no-cache' } }).pipe(
      timeout({ first: 8_000 }),
      map((response) => {
        if (!response.success || response.status !== 'ok') {
          throw new Error('Backend health check did not report ready.');
        }
        this.ready.set(true);
      }),
    ),
  ).pipe(
    retry({
      count: Infinity,
      delay: (_error, attempt) => timer(Math.min(10_000, 1_000 * 2 ** Math.min(attempt - 1, 3))),
    }),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  waitUntilReady() {
    return this.readinessCheck;
  }
}
