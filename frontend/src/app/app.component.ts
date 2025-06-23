/*
 * ==========================================================================
 * FICHEIRO: frontend/src/app/app.component.ts (ATUALIZADO)
 * ==========================================================================
 * - Adicionado o 'RouterModule' aos imports do componente.
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule } from '@angular/router'; // ✨ 1. IMPORTAR ROUTERMODULE
import { AuthService } from './auth/auth.service';
import { ChatService } from './pages/chat/chat.service';

@Component({
  selector: 'app-root',
  standalone: true,
  // ✨ 2. ADICIONAR ROUTERMODULE AOS IMPORTS
  imports: [CommonModule, RouterOutlet, RouterModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  title = 'gestao-processos';

  constructor(
    private authService: AuthService,
    private chatService: ChatService
  ) {}

  ngOnInit() {
    // Escuta por mudanças no estado de autenticação
    this.authService.getAuthState().subscribe((isLoggedIn) => {
      if (isLoggedIn) {
        // Se o utilizador está logado, obtém o ID e conecta ao WebSocket
        const user = this.authService.getCurrentUser();
        if (user) {
          console.log(
            `AppComponent: Utilizador logado (ID: ${user.id}). A conectar ao chat...`
          );
          this.chatService.connect(user.id);
        }
      } else {
        // Se o utilizador fez logout, fecha a conexão
        console.log(
          'AppComponent: Utilizador deslogado. A fechar a conexão do chat.'
        );
        this.chatService.close();
      }
    });

    // Verifica o estado inicial (caso a página seja recarregada e o utilizador já esteja logado)
    const initialUser = this.authService.getCurrentUser();
    if (initialUser) {
      this.chatService.connect(initialUser.id);
    }
  }
}
