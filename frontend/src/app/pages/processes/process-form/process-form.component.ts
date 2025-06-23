/*
 * ==========================================================================
 * FICHEIRO: frontend/src/app/pages/processes/process-form.component.ts (ATUALIZADO)
 * ==========================================================================
 * - Adicionada a lógica para funcionar em modo de "Criação" e "Edição".
 * - Se um ID for encontrado na URL, o formulário é pré-preenchido
 * com os dados do processo para edição.
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router'; // Importar ActivatedRoute
import { HttpClient } from '@angular/common/http';
import { ProcessService, Process } from '../process.service';
import { UserService } from '../../users/user.service';

interface User {
  id: number;
  name: string;
  role: string;
}

@Component({
  selector: 'app-process-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './process-form.component.html',
  styleUrls: ['./process-form.component.css'],
})
export class ProcessFormComponent implements OnInit {
  processData: any = { type: 'PAS' };
  users: User[] = [];
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

  isEditMode = false; // Flag para controlar o modo
  processId: number | null = null;

  constructor(
    private processService: ProcessService,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute, // Injetar ActivatedRoute
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // Verifica se há um ID na URL para determinar se estamos em modo de edição
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.processId = +id;
        this.loadProcessData(+id);
      }
    });

    this.userService.getUsers().subscribe((allUsers: any[]) => {
      this.users = allUsers.filter((u) =>
        ['encarregado', 'gestor', 'admin'].includes(u.role)
      );
    });
  }

  // Carrega os dados do processo para preencher o formulário no modo de edição
  loadProcessData(id: number): void {
    this.processService.getProcessById(String(id)).subscribe({
      next: (data) => {
        this.processData = data;
      },
      error: (err) => {
        this.errorMessage =
          'Erro ao carregar os dados do processo para edição.';
        console.error(err);
      },
    });
  }

  onCepBlur(event: any): void {
    const cep = event.target.value.replace(/\D/g, '');
    if (cep.length === 8) {
      this.http.get(`https://viacep.com.br/ws/${cep}/json/`).subscribe({
        next: (data: any) => {
          if (!data.erro) {
            this.processData.logradouro = data.logradouro;
            this.processData.bairro = data.bairro;
            this.processData.cidade = data.localidade;
            this.processData.estado = data.uf;
            document.getElementById('numero')?.focus();
            this.errorMessage = '';
          } else {
            this.errorMessage = 'CEP não encontrado.';
          }
        },
        error: () => {
          this.errorMessage = 'Erro ao consultar o CEP.';
        },
      });
    }
  }

  onSubmit(): void {
    this.isSubmitting = true;
    this.successMessage = '';
    this.errorMessage = '';

    if (this.isEditMode && this.processId) {
      // Modo de Edição: chama o serviço de atualização
      this.processService
        .updateProcess(this.processId, this.processData)
        .subscribe({
          next: (response) => {
            this.successMessage = `Processo Nº ${response.process_number} atualizado com sucesso!`;
            this.isSubmitting = false;
            setTimeout(() => {
              this.router.navigate(['/processes', response.id]);
            }, 2000);
          },
          error: (err) => {
            this.errorMessage =
              err.error.message || 'Ocorreu um erro ao atualizar o processo.';
            this.isSubmitting = false;
          },
        });
    } else {
      // Modo de Criação: chama o serviço de criação
      this.processService.createProcess(this.processData).subscribe({
        next: (response: any) => {
          this.successMessage = `Processo Nº ${response.process_number} criado com sucesso!`;
          this.isSubmitting = false;
          setTimeout(() => {
            this.router.navigate(['/processes', response.id]);
          }, 2000);
        },
        error: (err) => {
          this.errorMessage =
            err.error.message || 'Ocorreu um erro ao criar o processo.';
          this.isSubmitting = false;
        },
      });
    }
  }
}
