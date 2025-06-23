/*
 * ========================================================================
 * FICHEIRO: frontend/src/app/auth/admin.guard.ts (ATUALIZADO)
 * ========================================================================
 * - Adicionados logs de depuração para verificar a permissão do utilizador
 * ao tentar aceder a rotas protegidas.
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Guarda que permite o acesso apenas a utilizadores com a role 'admin'.
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAdmin()) {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};

/**
 * Guarda que permite o acesso a utilizadores com a role 'gestor' ou 'admin'.
 */
export const gestorOrAdminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // ✨ LOGS DE DEPURAÇÃO ADICIONADOS AQUI ✨
  const user = authService.getCurrentUser();
  console.log('--- Verificando Guarda (gestorOrAdminGuard) ---');
  console.log('A tentar aceder à rota:', state.url);
  console.log('Role do utilizador atual:', user?.role);

  if (authService.isGestorOrAdmin()) {
    console.log('Resultado: PERMISSÃO CONCEDIDA.');
    return true;
  }

  console.log('Resultado: PERMISSÃO NEGADA. A redirecionar para /dashboard.');
  router.navigate(['/dashboard']);
  return false;
};
