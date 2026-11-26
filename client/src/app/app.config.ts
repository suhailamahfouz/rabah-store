import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { storefrontLoadingInterceptor } from './interceptors/storefront-loading.interceptor';
import { adminSessionInterceptor } from './interceptors/admin-session.interceptor';
import { BackendReadinessService } from './services/backend-readiness.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([adminSessionInterceptor, storefrontLoadingInterceptor])),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    // Do not render the store until a waking backend has confirmed it is ready.
    provideAppInitializer(() => inject(BackendReadinessService).waitUntilReady()),
  ]
};
