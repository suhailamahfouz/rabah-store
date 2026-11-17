import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { storefrontLoadingInterceptor } from './interceptors/storefront-loading.interceptor';
import { adminSessionInterceptor } from './interceptors/admin-session.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([adminSessionInterceptor, storefrontLoadingInterceptor])),
    provideRouter(routes)
  ]
};
