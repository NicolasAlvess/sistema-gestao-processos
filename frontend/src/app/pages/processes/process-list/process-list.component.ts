/*
 * ========================================================================
 * FICHEIRO: frontend/src/app/pages/processes/process-list.component.ts (VERSÃO FINAL CORRIGIDA)
 * ========================================================================
 * - A função deleteProcess() foi atualizada para usar o novo método
 * do serviço (updateProcessStatus), implementando o "soft delete".
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  ProcessService,
  Process,
  PaginatedProcesses,
} from '../process.service';
import { AuthService } from '../../../auth/auth.service';

@Component({
  selector: 'app-process-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, DatePipe],
  templateUrl: './process-list.component.html',
  styleUrls: ['./process-list.component.css'],
})
export class ProcessListComponent implements OnInit {
  processes: Process[] = [];
  isLoading = true;
  errorMessage = '';

  // Propriedades para filtros e paginação
  filters = {
    searchTerm: '',
    status: '',
    type: '',
    page: 1,
    limit: 10,
    sortBy: 'creation_desc', // ✨ NOVA PROPRIEDADE DE ORDENAÇÃO
  };
  totalItems = 0;
  totalPages = 0;
  pages: number[] = [];

  // Opções para os dropdowns de filtro
  statusOptions = [
    'instaurado',
    'Aguardando recebimento da primeira notificação',
    'Aguardado prazo alegações iniciais',
    'Enviar notificação para as alegações finais',
    'Aguardando recebimento da segunda notificação',
    'Aguardando prazo alegações finais',
    'Aguardando solução do processo',
    'arquivado',
    'excluido', // Adicionado para permitir filtrar por excluídos
  ];
  typeOptions = ['PAS', 'PACCR'];

  constructor(
    private processService: ProcessService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadProcesses();
  }

  loadProcesses(): void {
    this.isLoading = true;
    this.processService.getProcesses(this.filters).subscribe({
      next: (data: PaginatedProcesses) => {
        this.processes = data.processes;
        this.totalItems = data.totalItems;
        this.totalPages = data.totalPages;
        this.updatePageNumbers();
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Falha ao carregar a lista de processos.';
        this.isLoading = false;
        console.error(err);
      },
    });
  }

  applyFilters(): void {
    this.filters.page = 1;
    this.loadProcesses();
  }

  clearFilters(): void {
    // ✨ ATUALIZADO PARA RESETAR A ORDENAÇÃO TAMBÉM
    this.filters = {
      searchTerm: '',
      status: '',
      type: '',
      page: 1,
      limit: 10,
      sortBy: 'creation_desc',
    };
    this.loadProcesses();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.filters.page = page;
      this.loadProcesses();
    }
  }

  updatePageNumbers(): void {
    this.pages = [];
    const maxPagesToShow = 5;
    let startPage: number, endPage: number;

    if (this.totalPages <= maxPagesToShow) {
      startPage = 1;
      endPage = this.totalPages;
    } else {
      const maxPagesBeforeCurrent = Math.floor(maxPagesToShow / 2);
      const maxPagesAfterCurrent = Math.ceil(maxPagesToShow / 2) - 1;
      if (this.filters.page <= maxPagesBeforeCurrent) {
        startPage = 1;
        endPage = maxPagesToShow;
      } else if (this.filters.page + maxPagesAfterCurrent >= this.totalPages) {
        startPage = this.totalPages - maxPagesToShow + 1;
        endPage = this.totalPages;
      } else {
        startPage = this.filters.page - maxPagesBeforeCurrent;
        endPage = this.filters.page + maxPagesAfterCurrent;
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      this.pages.push(i);
    }
  }

  // ✨ ========================================================== ✨
  // ✨ FUNÇÃO DE EXCLUSÃO ATUALIZADA (LÓGICA CORRIGIDA)
  // ✨ ========================================================== ✨
  deleteProcess(id: number): void {
    if (
      confirm(
        'Tem a certeza de que deseja excluir este processo? Ele será movido para os excluídos e poderá ser consultado no relatório.'
      )
    ) {
      this.processService.updateProcessStatus(id, 'excluido').subscribe({
        next: () => {
          // Recarrega a lista para remover o processo da visão atual
          this.loadProcesses();
        },
        error: (err:any) => {
          this.errorMessage =
            err.error?.message || 'Não foi possível excluir o processo.';
          console.error(err);
        },
      });
    }
  }

  getStatusBadgeClass(process: Process): any {
    const status = process.status.toLowerCase();
    if (status.includes('arquivado')) return { 'bg-dark': true };
    if (status.includes('excluido')) return { 'bg-danger': true }; // Badge para excluído
    if (status.includes('prazo'))
      return { 'bg-warning': true, 'text-dark': true };
    if (status.includes('notificação'))
      return { 'bg-info': true, 'text-dark': true };
    if (status.includes('instaurado')) return { 'bg-primary': true };
    return { 'bg-secondary': true };
  }

  getNextDeadline(process: Process): string | null {
    if (process.status === 'Aguardado prazo alegações iniciais') {
      return process.initial_statement_deadline || null;
    }
    if (process.status === 'Aguardando prazo alegações finais') {
      return process.final_statement_deadline || null;
    }
    return null;
  }

  getDaysRemaining(deadline: string | null): number | null {
    if (!deadline) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getDeadlineClass(days: number | null): any {
    if (days === null) return {};
    if (days < 0) return { 'text-danger': true, 'fw-bold': true };
    if (days <= 7) return { 'text-warning': true };
    return { 'text-success': true };
  }
}
