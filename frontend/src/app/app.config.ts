/*
 * ========================================================================
 * FICHEIRO: frontend/src/app/app.config.ts (CORRIGIDO)
 * ========================================================================
 * - Adicionada a função 'provideRouter' para registar corretamente
 * todas as rotas na aplicação, resolvendo o problema dos botões
 * com 'routerLink' não funcionarem.
 */

import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';

import { routes } from './app.routes';
import { tokenInterceptor } from './auth/token.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // ✨ A LINHA MAIS IMPORTANTE ESTÁ AQUI ✨
    // Garante que as rotas definidas em app.routes.ts são carregadas
    provideRouter(routes),

    // Configura o HttpClient para usar o nosso interceptor de token
    provideHttpClient(withInterceptors([tokenInterceptor])),

    // Outros providers que a sua aplicação já usa
    provideAnimations(),
    provideToastr(),
  ],
};
