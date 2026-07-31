import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  return auth.hasValidToken()
    ? true
    : inject(Router).createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url },
      });
};

export const loginGuard: CanMatchFn = () =>
  inject(AuthService).hasValidToken()
    ? inject(Router).createUrlTree(['/dashboard'])
    : true;
