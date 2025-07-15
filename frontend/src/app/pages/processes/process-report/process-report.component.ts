/*
 * ========================================================================
 * FICHEIRO: frontend/src/app/pages/processes/process-report/component.ts (VERSÃO FINAL E COMPLETA)
 * ========================================================================
 * ATUALIZAÇÃO: Adicionada a lógica em 'loadProcessData' para pré-preencher
 * os campos editáveis do Relatório Final com textos padrão dinâmicos.
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
  imports: [CommonModule, FormsModule, RouterModule]
})
export class ProcessReportComponent implements OnInit {

  process: Process | undefined;
  isLoading = true;
  selectedTemplate = 'paccr';
  processId!: number;
  isDownloading = false;

  constructor(
    private route: ActivatedRoute,
    private processService: ProcessService
  ) { }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.processId = +idParam;
      this.loadProcessData();
    } else {
      this.isLoading = false;
      console.error('[ngOnInit] ERRO: ID do processo não foi encontrado na URL!');
    }
  }

  // =======================================================
  // ✨ FUNÇÃO ATUALIZADA COM A LÓGICA DO RELATÓRIO FINAL ✨
  // =======================================================
  loadProcessData(): void {
    this.isLoading = true;
    this.processService.getProcessById(String(this.processId)).subscribe({
      next: (data) => {
        // Lógica para pré-preencher o campo "Apreciação da Defesa" se estiver vazio
        if (!data.relatorio_apreciacao_defesa) {
          data.relatorio_apreciacao_defesa = `a. alegações do Administrado:\n\n\nb. apreciação das alegações do Administrado:\n\n`;
        }

        // Lógica para pré-preencher o campo "Conclusão" com dados dinâmicos se estiver vazio
        if (!data.relatorio_conclusao) {
          const nome = data.interested_party || '[NOME DO ADMINISTRADO]';
          const cr = data.cr || '[NÚMERO DO CR]';
          const cpf = data.cpf || '[NÚMERO DO CPF]';
          
          data.relatorio_conclusao = `a. A suspensão temporária do Certificado de Registro (CR) nº ${cr} do Sr. ${nome}, portador do CPF nº ${cpf}, deve ser cessada;\n\nb. a fim de bem atender ao que prevê a Lei nº 9784/1999 em seu art. 47, o Processo Administrativo em tela deve ser remetido ao Comandante da B Ap R Sorocaba para a confecção da Solução Final, ou mesmo, para determinação de diligências.`;
        }

        this.process = data;
        this.isLoading = false;
        console.log('[loadProcessData] Dados do processo carregados e pré-preenchidos:', this.process);
      },
      error: (err: any) => {
        console.error('[loadProcessData] Erro ao carregar dados do processo', err);
        alert('Não foi possível carregar os dados do processo.');
        this.isLoading = false;
      }
    });
  }

  saveChanges(): void {
    if (!this.process) return;
    this.processService.updateProcess(this.processId, this.process).subscribe({
      next: (updatedProcess) => {
        alert('Alterações salvas com sucesso!');
        this.process = updatedProcess;
      },
      error: (err: any) => {
        console.error('Erro ao salvar as alterações:', err);
        alert('Falha ao salvar as alterações.');
      }
    });
  }
  
  downloadProcessReport(): void {
    if (!this.processId) return;
    this.isDownloading = true;
    this.processService.getProcessReport(this.processId, this.selectedTemplate).subscribe({
      next: (data: Blob) => {
        saveAs(data, `relatorio-${this.selectedTemplate}-${this.processId}.pdf`);
        this.isDownloading = false;
      },
      error: (err: any) => {
        alert('Houve um erro ao gerar o documento.');
        this.isDownloading = false;
      }
    });
  }

  printPage(): void { window.print(); }
  formatSimpleDate(dateStr?: string): string { if (!dateStr) return ''; return new Date(dateStr).toLocaleDateString('pt-BR', { timeZone: 'UTC' }); }
  formatDateToWords(dateStr?: string): string { if (!dateStr) return ''; return new Date(dateStr).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }); }
  getFutureDate(dateStr: string | undefined, days: number): string { if (!dateStr) return ''; const d = new Date(dateStr); d.setUTCDate(d.getUTCDate() + days); return new Date(d).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }); }
}