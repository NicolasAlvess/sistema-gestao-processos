import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Se o usuário estiver logado, permita o acesso
  if (authService.isLoggedIn()) {
    return true;
  }

  // Se não estiver logado, redirecione para a página de login
  router.navigate(['/login']);
  return false;
};
