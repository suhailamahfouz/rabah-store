import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * The server is the authority. This only handles the UX after the server
 * rejects an expired/revoked admin session; it is not an authorization check.
 */
export const adminSessionInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  const isAdminEndpoint = request.url.includes('/api/admin/');
  const isSessionCheck = request.url.endsWith('/api/admin/session');

  return next(request).pipe(
    catchError((error: unknown) => {
      if (isAdminEndpoint && !isSessionCheck && error instanceof HttpErrorResponse && error.status === 401 && !router.url.startsWith('/login')) {
        void router.navigate(['/login'], { replaceUrl: true });
      }
      return throwError(() => error);
    }),
  );
};
