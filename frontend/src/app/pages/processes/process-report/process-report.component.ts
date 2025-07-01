/*
 * ========================================================================
 * FICHEIRO: frontend/src/app/pages/processes/process-report/process-report.component.ts (VERSÃO FINAL E COMPLETA)
 * ========================================================================
 * CORREÇÃO FINAL: Garante que loadProcessData() é chamado corretamente e
 * que a variável 'process' é populada para que a tela e os botões apareçam.
 */

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ProcessService, Process } from '../process.service';
import { saveAs } from 'file-saver';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-process-report',
  templateUrl: './process-report.component.html',
  styleUrls: ['./process-report.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
})
export class ProcessReportComponent implements OnInit {
  // Propriedades para os dados e estado da página
  process: Process | undefined;
  isLoading = true;
  selectedTemplate = 'paccr';
  processId!: number;
  isDownloading = false;

  constructor(
    private route: ActivatedRoute,
    private processService: ProcessService
  ) {}

  ngOnInit(): void {
    // Pega o ID da rota para sabermos qual processo carregar.
    // A rota deve ser algo como 'processes/:id/report'.
    // Usamos 'this.route.snapshot' em vez de 'this.route.parent.snapshot' para mais robustez.
    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam) {
      this.processId = +idParam;
      console.log(
        `[ngOnInit] ID do processo encontrado na rota: ${this.processId}`
      );
      this.loadProcessData(); // Chama a função para carregar os dados
    } else {
      this.isLoading = false;
      console.error(
        '[ngOnInit] ERRO: ID do processo não foi encontrado na URL! Verifique a configuração da sua rota.'
      );
    }
  }

  // Esta função é crucial para carregar os dados que a tela precisa para ser exibida
  loadProcessData(): void {
    this.isLoading = true;
    console.log(
      `[loadProcessData] Buscando dados para o processo ID: ${this.processId}`
    );
    this.processService.getProcessById(String(this.processId)).subscribe({
      next: (data) => {
        this.process = data; // A variável 'process' é preenchida aqui!
        this.isLoading = false;
        console.log(
          '[loadProcessData] Dados do processo carregados com sucesso:',
          this.process
        );
      },
      error: (err: any) => {
        console.error(
          '[loadProcessData] Erro ao carregar dados do processo',
          err
        );
        alert(
          'Não foi possível carregar os dados do processo. Verifique o console para mais detalhes.'
        );
        this.isLoading = false;
      },
    });
  }

  downloadProcessReport(): void {
    if (!this.processId) return;

    this.isDownloading = true;
    this.processService
      .getProcessReport(this.processId, this.selectedTemplate)
      .subscribe({
        next: (data: Blob) => {
          saveAs(
            data,
            `relatorio-${this.selectedTemplate}-${this.processId}.pdf`
          );
          this.isDownloading = false;
        },
        error: (err: any) => {
          console.error(
            '[FRONTEND] Erro ao baixar o relatório do backend:',
            err
          );
          alert('Houve um erro ao gerar o documento no servidor.');
          this.isDownloading = false;
        },
      });
  }

  saveChanges(): void {
    /* Sua lógica para salvar aqui */
  }

  printPage(): void {
    window.print();
  }

  // Funções de formatação de data que seu template HTML usa
  formatSimpleDate(dateStr?: string): string {
    if (!dateStr) return 'Data não informada';
    return new Date(dateStr).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }
  formatDateToWords(dateStr?: string): string {
    if (!dateStr) return '[Data por extenso]';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });
  }
  getFutureDate(dateStr: string | undefined, days: number): string {
    if (!dateStr) return '[Data futura]';
    const d = new Date(dateStr);
    d.setUTCDate(d.getUTCDate() + days);
    return new Date(d).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });
  }
}
