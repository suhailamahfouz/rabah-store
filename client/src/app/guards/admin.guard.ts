import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AdminService } from '../services/admin.service';

export const adminGuard: CanActivateFn = () => {
  const adminApi = inject(AdminService);
  const router = inject(Router);

  return adminApi.session().pipe(
    map(() => true),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};
