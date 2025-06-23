/*
 * ==========================================================================
 * FICHEIRO: frontend/src/app/pages/processes/process-report/process-report.component.ts
 * ==========================================================================
 * Este ficheiro já está correto, incluindo o registo da localidade 'pt'
 * para formatar a data como "13 de junho de 2025".
 * Nenhuma alteração é necessária aqui.
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Process, ProcessService } from '../process.service';
import { switchMap } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';

// Registar a localidade para o pipe de data
registerLocaleData(localePt);

@Component({
  selector: 'app-process-report',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, FormsModule],
  templateUrl: './process-report.component.html',
  styleUrls: ['./process-report.component.css']
})
export class ProcessReportComponent implements OnInit {
  process: Process | undefined;
  isLoading = true;
  errorMessage = '';
  currentDate = new Date();

  selectedTemplate: 'relatorio_geral' | 'notificacao_oficio' | 'relatorio_final' = 'notificacao_oficio';
  initialDeadlineDays: number = 15;

  constructor(
    private route: ActivatedRoute,
    private processService: ProcessService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        if (id) {
          this.isLoading = true;
          return this.processService.getProcessById(id);
        }
        throw new Error('ID do processo não encontrado.');
      })
    ).subscribe({
      next: (data) => {
        this.process = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Falha ao carregar os dados do processo para o relatório.';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  printPage(): void {
    window.print();
  }
}
