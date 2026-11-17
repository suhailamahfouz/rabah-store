import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, defer, filter, finalize, retry, throwError, timeout, timer } from 'rxjs';
import { StorefrontLoadingService } from '../services/storefront-loading.service';

// Only safe public reads are retried. Never replay checkout/admin mutations.
export const storefrontLoadingInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.method !== 'GET' || !/^\/api\/(products|categories|store-settings)(\/|\?|$)/.test(request.url)) return next(request);
  const state = inject(StorefrontLoadingService);
  const key = request.urlWithParams;
  return defer(() => {
    state.begin(key);
    return defer(() => next(request)).pipe(
      filter(event => event instanceof HttpResponse),
      timeout({ first: 25000 }),
      retry({ count: 2, delay: (error, attempt) => {
        const transient = error.name === 'TimeoutError' || error.status === 0 || [408, 429, 500, 502, 503, 504].includes(error.status);
        return transient ? timer(attempt * 1500) : throwError(() => error);
      } }),
      catchError(error => { state.fail(key); return throwError(() => error); }),
      finalize(() => state.end(key)),
    );
  });
};
