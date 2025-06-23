/*
 * ==========================================================================
 * FICHEIRO: frontend/src/app/pages/processes/process-detail/process-detail.component.ts (VERSÃO FINAL E COMPLETA)
 * ==========================================================================
 * - Contém toda a lógica para a página de detalhes, incluindo a gestão
 * condicional das datas de GRU (para PAS) e Polícia Civil (para PACCR).
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Process, ProcessService, Document, Firearm } from '../process.service';
import { switchMap } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../auth/auth.service';

@Component({
  selector: 'app-process-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, FormsModule],
  templateUrl: './process-detail.component.html',
  styleUrls: ['./process-detail.component.css'],
})
export class ProcessDetailComponent implements OnInit {
  process: Process | undefined;
  isLoading = true;
  errorMessage = '';
  successMessage = '';
  finalSolutionDocument: Document | undefined;

  firearmSummary = {
    total: 0,
    ok: 0,
    apprehended: 0,
    stolen: 0,
  };

  notificationDates = {
    notification1_sent_date: '',
    notification1_received_date: '',
    notification2_sent_date: '',
    notification2_received_date: '',
  };

  initialDeadlineDays: number | null = 15;
  finalDeadlineDays: number | null = 10;

  documentUpload = { type: null as string | null };
  selectedFile: File | null = null;

  finalizationData = {
    publicationDate: '',
    bulletinNumber: '',
    solutionFile: null as File | null,
  };

  // Objeto que guarda os dados do formulário do modal
  closingDates = {
    solution_sent_date: '',
    solution_received_date: '',
    gru_sent_date: '',
    gru_received_date: '',
    gru_payment_deadline: '',
    pc_sent_date: '',
    pc_received_date: '',
  };

  newFirearm = {
    serial_number: '',
    model: '',
    caliber: '',
    status: 'OK' as 'Apreendida' | 'Roubada' | 'OK',
  };

  constructor(
    private route: ActivatedRoute,
    private processService: ProcessService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadProcessDetails();
  }

  loadProcessDetails(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = params.get('id');
          if (id) {
            this.isLoading = true;
            this.successMessage = '';
            this.errorMessage = '';
            return this.processService.getProcessById(id);
          }
          throw new Error('ID do processo não encontrado.');
        })
      )
      .subscribe({
        next: (data: Process) => {
          this.process = data;
          if (data.documents) {
            this.finalSolutionDocument = data.documents.find(
              (doc) => doc.document_type === 'Solução Final'
            );
          }
          this.calculateFirearmSummary(data.firearms || []);
          this.prepareNotificationForm(data);
          this.prepareClosingDatesForm(data);
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = 'Falha ao carregar os detalhes do processo.';
          this.isLoading = false;
          console.error(err);
        },
      });
  }

  calculateFirearmSummary(firearms: Firearm[]): void {
    this.firearmSummary.total = firearms.length;
    this.firearmSummary.ok = firearms.filter((f) => f.status === 'OK').length;
    this.firearmSummary.apprehended = firearms.filter(
      (f) => f.status === 'Apreendida'
    ).length;
    this.firearmSummary.stolen = firearms.filter(
      (f) => f.status === 'Roubada'
    ).length;
  }

  prepareNotificationForm(process: Process): void {
    this.notificationDates.notification1_sent_date =
      process.notification1_sent_date?.slice(0, 10) || '';
    this.notificationDates.notification1_received_date =
      process.notification1_received_date?.slice(0, 10) || '';
    this.notificationDates.notification2_sent_date =
      process.notification2_sent_date?.slice(0, 10) || '';
    this.notificationDates.notification2_received_date =
      process.notification2_received_date?.slice(0, 10) || '';
  }

  onSaveDates(): void {
    if (!this.process) return;
    this.processService
      .updateNotificationDates(this.process.id, this.notificationDates)
      .subscribe({
        next: (updatedProcess: Process) => {
          this.process = updatedProcess;
          this.prepareNotificationForm(updatedProcess);
          this.successMessage = 'Datas de notificação atualizadas com sucesso!';
          this.errorMessage = '';
        },
        error: (err) => {
          this.errorMessage = 'Erro ao atualizar as datas.';
          this.successMessage = '';
          console.error(err);
        },
      });
  }

  setInitialDeadline(): void {
    if (
      !this.process?.notification1_received_date ||
      !this.initialDeadlineDays
    ) {
      this.errorMessage =
        'É necessário definir a "Data de Recebimento da 1ª Notificação" primeiro.';
      return;
    }
    this.errorMessage = '';
    const receptionDate = new Date(this.process.notification1_received_date);
    receptionDate.setDate(receptionDate.getDate() + this.initialDeadlineDays);
    const deadlines = {
      initial_statement_deadline: receptionDate.toISOString(),
    };
    this.processService.updateDeadlines(this.process.id, deadlines).subscribe({
      next: (updatedProcess: Process) => {
        this.process = updatedProcess;
        this.successMessage =
          'Prazo para alegações iniciais definido com sucesso!';
      },
      error: () => (this.errorMessage = 'Erro ao definir o prazo.'),
    });
  }

  setFinalDeadline(): void {
    if (!this.process?.notification2_received_date || !this.finalDeadlineDays) {
      this.errorMessage =
        'É necessário definir a "Data de Recebimento da 2ª Notificação" primeiro.';
      return;
    }
    this.errorMessage = '';
    const receptionDate = new Date(this.process.notification2_received_date);
    receptionDate.setDate(receptionDate.getDate() + this.finalDeadlineDays);
    const deadlines = { final_statement_deadline: receptionDate.toISOString() };
    this.processService.updateDeadlines(this.process.id, deadlines).subscribe({
      next: (updatedProcess: Process) => {
        this.process = updatedProcess;
        this.successMessage =
          'Prazo para alegações finais definido com sucesso!';
      },
      error: () => (this.errorMessage = 'Erro ao definir o prazo.'),
    });
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.selectedFile = target.files ? target.files[0] : null;
  }

  onUploadDocument(): void {
    if (!this.selectedFile || !this.documentUpload.type || !this.process) {
      this.errorMessage =
        'Por favor, selecione um ficheiro e um tipo de documento.';
      return;
    }
    const formData = new FormData();
    formData.append('file', this.selectedFile, this.selectedFile.name);
    formData.append('document_type', this.documentUpload.type);
    this.processService.uploadDocument(this.process.id, formData).subscribe({
      next: () => {
        this.successMessage = 'Documento anexado com sucesso!';
        this.loadProcessDetails();
        this.selectedFile = null;
        this.documentUpload.type = null;
        const fileInput = document.getElementById(
          'fileUpload'
        ) as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      },
      error: (err) => {
        this.errorMessage = 'Erro ao anexar o documento.';
        this.successMessage = '';
        console.error(err);
      },
    });
  }

  downloadDocument(doc: Document): void {
    window.open(`http://localhost:3000/uploads/${doc.file_name}`, '_blank');
  }

  deleteDocument(docId: number): void {
    if (
      !this.process ||
      !window.confirm(
        'Tem a certeza de que deseja eliminar este documento? Esta ação é irreversível.'
      )
    ) {
      return;
    }
    this.processService.deleteDocument(this.process.id, docId).subscribe({
      next: () => {
        this.successMessage = 'Documento eliminado com sucesso.';
        this.loadProcessDetails();
      },
      error: (err) => {
        this.errorMessage = 'Erro ao eliminar o documento.';
        this.successMessage = '';
        console.error(err);
      },
    });
  }

  onFinalSolutionFileSelected(event: Event): void {
    const element = event.target as HTMLInputElement;
    if (element.files && element.files.length > 0) {
      this.finalizationData.solutionFile = element.files[0];
    }
  }

  submitFinalSolution(): void {
    if (
      !this.process ||
      !this.finalizationData.solutionFile ||
      !this.finalizationData.publicationDate ||
      !this.finalizationData.bulletinNumber
    ) {
      this.errorMessage =
        'Por favor, preencha todos os campos da Solução Final e selecione o arquivo.';
      this.successMessage = '';
      return;
    }
    const formData = new FormData();
    formData.append('publicationDate', this.finalizationData.publicationDate);
    formData.append('bulletinNumber', this.finalizationData.bulletinNumber);
    formData.append(
      'solutionFile',
      this.finalizationData.solutionFile,
      this.finalizationData.solutionFile.name
    );
    this.processService.finalizeProcess(this.process.id, formData).subscribe({
      next: (updatedProcess) => {
        this.successMessage = 'Processo finalizado e arquivado com sucesso!';
        this.errorMessage = '';
        this.process = updatedProcess;
        this.loadProcessDetails();
      },
      error: (err) => {
        console.error('Erro ao finalizar processo', err);
        this.errorMessage =
          'Ocorreu um erro ao finalizar o processo. Verifique a consola.';
        this.successMessage = '';
      },
    });
  }

  prepareClosingDatesForm(process: Process): void {
    this.closingDates.solution_sent_date =
      process.solution_sent_date?.slice(0, 10) || '';
    this.closingDates.solution_received_date =
      process.solution_received_date?.slice(0, 10) || '';
    this.closingDates.gru_sent_date = process.gru_sent_date?.slice(0, 10) || '';
    this.closingDates.gru_received_date =
      process.gru_received_date?.slice(0, 10) || '';
    this.closingDates.gru_payment_deadline =
      process.gru_payment_deadline?.slice(0, 10) || '';
    this.closingDates.pc_sent_date = process.pc_sent_date?.slice(0, 10) || '';
    this.closingDates.pc_received_date =
      process.pc_received_date?.slice(0, 10) || '';
  }

  onSaveClosingDates(): void {
    if (!this.process) return;
    this.processService
      .updateClosingDates(this.process.id, this.closingDates)
      .subscribe({
        next: (updatedProcess) => {
          this.successMessage = 'Datas de cumprimento atualizadas com sucesso!';
          this.errorMessage = '';
          this.process = updatedProcess;
          this.prepareClosingDatesForm(updatedProcess);
        },
        error: (err) => {
          this.errorMessage = 'Erro ao atualizar as datas de cumprimento.';
          this.successMessage = '';
          console.error(err);
        },
      });
  }

  onAddFirearm(): void {
    if (!this.process) return;
    if (
      !this.newFirearm.serial_number ||
      !this.newFirearm.model ||
      !this.newFirearm.caliber
    ) {
      this.errorMessage = 'Por favor, preencha todos os campos da arma.';
      this.successMessage = '';
      return;
    }
    this.processService.addFirearm(this.process.id, this.newFirearm).subscribe({
      next: () => {
        this.successMessage = 'Arma adicionada com sucesso!';
        this.errorMessage = '';
        this.newFirearm = {
          serial_number: '',
          model: '',
          caliber: '',
          status: 'OK',
        };
        this.loadProcessDetails();
      },
      error: (err) => {
        this.errorMessage = err.error.message || 'Erro ao adicionar a arma.';
        this.successMessage = '';
      },
    });
  }
}
