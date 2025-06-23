/*
 * ==========================================================================
 * FICHEIRO: frontend/src/app/services/report.service.ts (ATUALIZADO)
 * ==========================================================================
 * - Interfaces atualizadas para corresponder à nova resposta detalhada da API.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// ✨ INTERFACE ATUALIZADA para um item de evento detalhado
export interface ProcessHistoryEvent {
  process_number: string;
  user_name: string;
  change_date: string;
}

// ✨ INTERFACE ATUALIZADA para a resposta completa do relatório
export interface ProcessSummaryReport {
  createdBy: ProcessHistoryEvent[];
  archivedBy: ProcessHistoryEvent[];
  deletedBy: ProcessHistoryEvent[];
}

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  private apiUrl = 'http://localhost:3000/api/reports';

  constructor(private http: HttpClient) {}

  getProcessSummaryReport(): Observable<ProcessSummaryReport> {
    return this.http.get<ProcessSummaryReport>(
      `${this.apiUrl}/process-summary`
    );
  }
}
