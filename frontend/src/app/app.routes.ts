/*
 * ========================================================================
 * FICHEIRO: frontend/src/app/app.routes.ts (CORRIGIDO)
 * ========================================================================
 * - Corrigido o caminho de importação do ProcessSummaryReportComponent
 * para corresponder à estrutura de pastas correta.
 */

import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { authGuard } from './auth/auth.guard';
import { UserManagementComponent } from './pages/users/user-management/user-management.component';
import { ProcessListComponent } from './pages/processes/process-list/process-list.component';
import { ProcessFormComponent } from './pages/processes/process-form/process-form.component';
import { ProcessDetailComponent } from './pages/processes/process-detail/process-detail.component';
import { ProcessReportComponent } from './pages/processes/process-report/process-report.component';
import { ChatComponent } from './pages/chat/chat.component';
// ✨ CAMINHO DA IMPORTAÇÃO CORRIGIDO
import { ProcessSummaryReportComponent } from './pages/reports/process-summary-report.component';
import { adminGuard, gestorOrAdminGuard } from './auth/admin.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
  },
  {
    path: 'admin/users',
    component: UserManagementComponent,
    canActivate: [authGuard, adminGuard],
  },
  {
    path: 'processes/new',
    component: ProcessFormComponent,
    canActivate: [authGuard, gestorOrAdminGuard],
  },
  {
    path: 'processes/edit/:id',
    component: ProcessFormComponent,
    canActivate: [authGuard, gestorOrAdminGuard],
  },
  {
    path: 'processes/:id/report',
    component: ProcessReportComponent,
    canActivate: [authGuard],
  },
  {
    path: 'processes/:id',
    component: ProcessDetailComponent,
    canActivate: [authGuard],
   
  },
  {
    path: 'processes',
    component: ProcessListComponent,
    canActivate: [authGuard],
  },
  {
    path: 'chat',
    component: ChatComponent,
    canActivate: [authGuard],
  },
  {
    path: 'reports/process-summary',
    component: ProcessSummaryReportComponent,
    canActivate: [authGuard, gestorOrAdminGuard],
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' },
];
