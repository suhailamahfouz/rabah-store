import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorefrontLoadingService {
  readonly requests = signal<Record<string, { pending: number; failed: boolean }>>({});
  begin(key: string): void {
    this.requests.update(all => ({ ...all, [key]: { pending: (all[key]?.pending ?? 0) + 1, failed: false } }));
  }
  fail(key: string): void {
    this.requests.update(all => ({ ...all, [key]: { ...all[key], failed: true } }));
  }
  end(key: string): void {
    this.requests.update(all => ({ ...all, [key]: { ...all[key], pending: Math.max(0, all[key].pending - 1) } }));
  }
  busy(prefix: string): boolean {
    return Object.entries(this.requests()).some(([key, state]) => key.startsWith(prefix) && state.pending > 0);
  }
  failed(prefix: string): boolean {
    return Object.entries(this.requests()).some(([key, state]) => key.startsWith(prefix) && state.failed && !state.pending);
  }
}
