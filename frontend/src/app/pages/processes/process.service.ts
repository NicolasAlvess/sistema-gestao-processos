/*
 * ==========================================================================
 * FICHEIRO: frontend/src/app/pages/processes/process.service.ts (VERSÃO FINAL COMPLETA)
 * ==========================================================================
 * CONTÉM TODAS AS FUNÇÕES NECESSÁRIAS, INCLUINDO 'updateProcessStatus'
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// --- INTERFACES ---
export interface Document {
  id: number;
  file_name: string;
  document_type: string;
}
export interface Firearm {
  id: number;
  serial_number: string;
  model: string;
  caliber: string;
  status: 'Apreendida' | 'Roubada' | 'OK';
}
export interface Process {
  defesa_apresentada?: boolean;
  id: number;
  process_number: string;
  type: 'PAS' | 'PACCR';
  status: string;
  interested_party: string;
  cr?: string;
  cpf_cnpj?: string;
  reason: string;
  created_by?: string;
  created_at?: string;
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
  cpf?: string;
  address?: string;
  infraction_details?: string;
  juntada_docs_1?: string;
  juntada_docs_2?: string;
  relatorio_apreciacao_defesa?: string;
  relatorio_conclusao?: string;
  
   
}
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
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getProcesses(filters: any = {}): Observable<PaginatedProcesses> {
    return this.http.get<PaginatedProcesses>(`${this.apiUrl}/processes`, {
      params: new HttpParams({ fromObject: filters }),
    });
  }

  getProcessById(id: string): Observable<Process> {
    return this.http.get<Process>(`${this.apiUrl}/processes/${id}`);
  }

  createProcess(processData: any): Observable<Process> {
    return this.http.post<Process>(`${this.apiUrl}/processes`, processData);
  }

  updateProcess(id: number, processData: any): Observable<Process> {
    return this.http.put<Process>(
      `${this.apiUrl}/processes/${id}`,
      processData
    );
  }

  // ================================================================
  // ✨ A FUNÇÃO QUE O COMPILADOR ESTÁ PROCURANDO ESTÁ AQUI ✨
  // ================================================================
  updateProcessStatus(
    id: number,
    status: 'excluido' | 'arquivado'
  ): Observable<Process> {
    return this.http.patch<Process>(`${this.apiUrl}/processes/${id}/status`, {
      status,
    });
  }

  updateNotificationDates(id: number, dates: any): Observable<Process> {
    return this.http.patch<Process>(
      `${this.apiUrl}/processes/${id}/dates`,
      dates
    );
  }

  updateDeadlines(
    id: number,
    deadlines: {
      initial_statement_deadline?: string;
      final_statement_deadline?: string;
    }
  ): Observable<Process> {
    return this.http.patch<Process>(
      `${this.apiUrl}/processes/${id}/deadlines`,
      deadlines
    );
  }

  uploadDocument(processId: number, formData: FormData): Observable<Document> {
    return this.http.post<Document>(
      `${this.apiUrl}/processes/${processId}/documents`,
      formData
    );
  }

  deleteDocument(processId: number, docId: number): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/processes/${processId}/documents/${docId}`
    );
  }

  finalizeProcess(processId: number, formData: FormData): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/processes/${processId}/finalize`,
      formData
    );
  }

  updateClosingDates(id: number, dates: any): Observable<Process> {
    return this.http.patch<Process>(
      `${this.apiUrl}/processes/${id}/closing-dates`,
      dates
    );
  }

  addFirearm(processId: number, firearmData: any): Observable<Firearm> {
    return this.http.post<Firearm>(
      `${this.apiUrl}/processes/${processId}/firearms`,
      firearmData
    );
  }

  // VERIFIQUE SE A SUA FUNÇÃO ESTÁ IDÊNTICA A ESTA
  getProcessReport(processId: number, templateId: string): Observable<Blob> {
    const reportUrl = `${this.apiUrl}/reports/${processId}/full-report`;

    // Esta linha é crucial
    const params = new HttpParams().set('template', templateId);

    console.log(
      `[ProcessService] Enviando requisição para: ${reportUrl} com parâmetro: ?template=${templateId}`
    );

    // E esta parte, passando { params: ... }, também é crucial
    return this.http.get(reportUrl, { params, responseType: 'blob' });
  }
}
