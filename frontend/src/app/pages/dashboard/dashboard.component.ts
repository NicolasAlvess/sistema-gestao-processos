/*
 * ========================================================================
 * FICHEIRO: frontend/src/app/pages/dashboard/dashboard.component.ts (ATUALIZADO)
 * ========================================================================
 * - Adicionado o Router e um novo método 'navigateToReports()' para
 * navegar para a página de relatório através de um evento de clique.
 */

import {
  Component,
  OnInit,
  AfterViewInit,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router'; // Router importado
import { Chart, registerables } from 'chart.js';
import { Observable } from 'rxjs';

import { AuthService } from '../../auth/auth.service';
import { DashboardService, DashboardStats } from './dashboard.service';
import { ChatService } from '../chat/chat.service';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit, AfterViewInit {
  stats: DashboardStats | undefined;
  isLoading = true;
  public unreadChatCount$: Observable<number>;

  constructor(
    public authService: AuthService,
    private dashboardService: DashboardService,
    private chatService: ChatService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router // Router injetado
  ) {
    this.unreadChatCount$ = this.chatService.unreadCount$;
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.chatService.fetchInitialUnreadCount();
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.dashboardService.getStats().subscribe((data) => {
        this.stats = data;
        this.isLoading = false;
        setTimeout(() => {
          this.createChart();
        }, 0);
      });
    } else {
      this.dashboardService.getStats().subscribe((data) => {
        this.stats = data;
        this.isLoading = false;
      });
    }
  }

  // ✨ NOVO MÉTODO PARA NAVEGAÇÃO
  navigateToReports(): void {
    console.log('Tentando navegar para /reports/process-summary...');
    this.router.navigate(['/reports/process-summary']);
  }

  createChart(): void {
    const canvas = document.getElementById(
      'processesByStatusChart'
    ) as HTMLCanvasElement;
    if (!canvas || !this.stats?.processesByStatus) {
      return;
    }

    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
      existingChart.destroy();
    }

    const labels = this.stats.processesByStatus.map((item) => item.status);
    const data = this.stats.processesByStatus.map((item) =>
      parseInt(item.count, 10)
    );

    new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Nº de Processos',
            data: data,
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
        },
      },
    });
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.chatService.close();
    }
    this.authService.logout();
  }
}
