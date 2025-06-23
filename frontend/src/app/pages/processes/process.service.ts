/*
 * ==========================================================================
 * FICHEIRO: frontend/src/app/pages/processes/process.service.ts (VERSÃO FINAL CORRIGIDA)
 * ==========================================================================
 * - Adicionada a função 'updateProcessStatus' para fazer o "soft delete".
 * - Removida a antiga função 'deleteProcess' que fazia o "hard delete".
 * - Adicionado o status 'excluido' à interface 'Process'.
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// Interface para um único Documento
export interface Document {
  id: number;
  file_name: string;
  document_type: string;
}

// Interface para uma Arma
export interface Firearm {
  id: number;
  serial_number: string;
  model: string;
  caliber: string;
  status: 'Apreendida' | 'Roubada' | 'OK';
}

// Interface para um único Processo
export interface Process {
  id: number;
  process_number: string;
  type: 'PAS' | 'PACCR';
  status:
    | 'instaurado'
    | 'em_analise'
    | 'notificacao'
    | 'defesa'
    | 'decisao'
    | 'recurso'
    | 'arquivado'
    | 'excluido' // ✨ STATUS ADICIONADO
    | 'Aguardando recebimento da primeira notificação'
    | 'Aguardado prazo alegações iniciais'
    | 'Enviar notificação para as alegações finais'
    | 'Aguardando recebimento da segunda notificação'
    | 'Aguardando prazo alegações finais'
    | 'Aguardando solução do processo';
  interested_party: string;
  cr?: string;
  cpf_cnpj?: string;
  reason: string;
  created_by?: string;
  notification1_sent_date?: string;
  notification1_received_date?: string;
  notification2_sent_date?: string;
  notification2_received_date?: string;
  initial_statement_deadline?: string;
  final_statement_deadline?: string;
  history?: any[];
  documents?: Document[];
  final_solution_publication_date?: string;
  final_solution_bulletin_number?: string;
  solution_sent_date?: string;
  solution_received_date?: string;
  gru_sent_date?: string;
  gru_received_date?: string;
  gru_payment_deadline?: string;
  boletim_ocorrencia?: string;
  inquerito_policial?: string;
  numero_oficio?: string;
  pc_sent_date?: string;
  pc_received_date?: string;
  email?: string;
  telefone?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  firearms?: Firearm[];
}

// Interface para a resposta da API, que agora inclui dados da paginação
export interface PaginatedProcesses {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  processes: Process[];
}

@Injectable({
  providedIn: 'root',
})
export class ProcessService {
  private apiUrl = 'http://localhost:3000/api/processes';

  constructor(private http: HttpClient) {}

  getProcesses(filters: any = {}): Observable<PaginatedProcesses> {
    let params = new HttpParams();
    Object.keys(filters).forEach((key) => {
      if (filters[key]) {
        params = params.set(key, filters[key]);
      }
    });
    return this.http.get<PaginatedProcesses>(this.apiUrl, { params });
  }

  createProcess(processData: any): Observable<Process> {
    return this.http.post<Process>(this.apiUrl, processData);
  }

  getProcessById(id: string): Observable<Process> {
    return this.http.get<Process>(`${this.apiUrl}/${id}`);
  }

  updateNotificationDates(id: number, dates: any): Observable<Process> {
    return this.http.patch<Process>(`${this.apiUrl}/${id}/dates`, dates);
  }

  updateDeadlines(
    id: number,
    deadlines: {
      initial_statement_deadline?: string;
      final_statement_deadline?: string;
    }
  ): Observable<Process> {
    return this.http.patch<Process>(
      `${this.apiUrl}/${id}/deadlines`,
      deadlines
    );
  }

  uploadDocument(processId: number, formData: FormData): Observable<Document> {
    return this.http.post<Document>(
      `${this.apiUrl}/${processId}/documents`,
      formData
    );
  }

  deleteDocument(processId: number, docId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${processId}/documents/${docId}`);
  }

  finalizeProcess(processId: number, formData: FormData): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${processId}/finalize`, formData);
  }

  updateClosingDates(id: number, dates: any): Observable<Process> {
    return this.http.patch<Process>(
      `${this.apiUrl}/${id}/closing-dates`,
      dates
    );
  }

  addFirearm(processId: number, firearmData: any): Observable<Firearm> {
    return this.http.post<Firearm>(
      `${this.apiUrl}/${processId}/firearms`,
      firearmData
    );
  }

  updateProcess(id: number, processData: any): Observable<Process> {
    return this.http.put<Process>(`${this.apiUrl}/${id}`, processData);
  }

  // ✨ ========================================================== ✨
  // ✨ NOVA FUNÇÃO PARA EXCLUIR/ARQUIVAR VIA "SOFT DELETE"
  // ✨ ========================================================== ✨
  updateProcessStatus(
    id: number,
    status: 'excluido' | 'arquivado'
  ): Observable<Process> {
    return this.http.patch<Process>(`${this.apiUrl}/${id}/status`, { status });
  }

  // A função deleteProcess(id) foi removida para evitar o hard delete.
}
