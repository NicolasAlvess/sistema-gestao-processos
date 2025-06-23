/*
 * ==========================================================================
 * FICHEIRO: frontend/src/app/pages/reports/process-summary-report.component.ts (CORRIGIDO)
 * ==========================================================================
 * - Corrigido o caminho de importação do ReportService.
 * - Adicionados os tipos explícitos para os parâmetros no 'subscribe'.
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
// ✨ O CAMINHO DA IMPORTAÇÃO FOI CORRIGIDO
import {
  ReportService,
  ProcessSummaryReport,
} from '../../services/report.service';

@Component({
  selector: 'app-process-summary-report',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './process-summary-report.component.html',
  styleUrls: ['./process-summary-report.component.css'],
})
export class ProcessSummaryReportComponent implements OnInit {
  reportData: ProcessSummaryReport | null = null;
  isLoading = true;
  errorMessage = '';

  constructor(private reportService: ReportService) {}

  ngOnInit(): void {
    this.loadReport();
  }

  loadReport(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.reportService.getProcessSummaryReport().subscribe({
      // ✨ Adicionados os tipos explícitos aqui
      next: (data: ProcessSummaryReport) => {
        this.reportData = data;
        this.isLoading = false;
      },
      error: (err: any) => {
        this.errorMessage =
          'Falha ao carregar o relatório. Por favor, tente novamente mais tarde.';
        this.isLoading = false;
        console.error(err);
      },
    });
  }

  parseCount(count: string): number {
    return parseInt(count, 10);
  }
}
