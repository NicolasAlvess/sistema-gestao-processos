/*
 * ==========================================================================
 * FICHEIRO: frontend/src/app/pages/users/user-management/user-management.component.ts
 * ==========================================================================
 * - A interface 'User' e o objeto 'newUser' foram atualizados.
 * - Adicionámos a validação de confirmação de senha.
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UserService } from '../user.service';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'gestor' | 'auxiliar' | 'encarregado';
  created_at: string;
  posto_graduacao?: string;
  nome_de_guerra?: string;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {

  users: User[] = [];

  newUser = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '', // Campo para confirmação
    role: 'auxiliar',
    posto_graduacao: '',
    nome_de_guerra: ''
  };

  roles: string[] = ['gestor', 'auxiliar', 'encarregado', 'admin'];
  successMessage = '';
  errorMessage = '';

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
      },
      error: (err) => {
        this.errorMessage = 'Falha ao carregar utilizadores.';
        console.error(err);
      }
    });
  }

  onRegisterSubmit(): void {
    // Validação de confirmação de senha
    if (this.newUser.password !== this.newUser.confirmPassword) {
      this.errorMessage = 'As senhas não coincidem. Tente novamente.';
      return;
    }

    if (!this.newUser.name || !this.newUser.email || !this.newUser.password || !this.newUser.role) {
      this.errorMessage = 'Por favor, preencha todos os campos obrigatórios.';
      return;
    }

    this.userService.createUser(this.newUser).subscribe({
      next: (createdUser) => {
        this.successMessage = `Utilizador "${createdUser.name}" cadastrado com sucesso!`;
        this.errorMessage = '';
        this.loadUsers();
        this.resetForm();
      },
      error: (err) => {
        this.errorMessage = 'Erro ao cadastrar utilizador. O email já pode existir.';
        this.successMessage = '';
        console.error(err);
      }
    });
  }

  private resetForm(): void {
    this.newUser = {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'auxiliar',
      posto_graduacao: '',
      nome_de_guerra: ''
    };
  }

  formatRole(role: string): string {
    return role.charAt(0).toUpperCase() + role.slice(1);
  }
}
