/*
 * ==========================================================================
 * FICHEIRO: frontend/src/app/pages/chat/chat.component.ts (VERSÃO FINAL)
 * ==========================================================================
 * - Versão estável e corrigida.
 * - Assume que a conexão WebSocket é gerida pelo app.component.ts.
 * - Carrega o histórico e os contadores de não lidas corretamente.
 * - Marca as conversas como lidas ao serem abertas.
 */

import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  AfterViewChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ChatService, ChatMessage } from './chat.service';
import { AuthService } from '../../auth/auth.service';
import { UserService } from '../users/user.service';

interface ChatUser {
  id: number;
  name: string;
  posto_graduacao?: string;
  nome_de_guerra?: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  users: ChatUser[] = [];
  selectedUser: ChatUser | null = null;
  activeConversationMessages: ChatMessage[] = [];
  newMessage: string = '';
  currentUser: { id: number; name: string } | null = null;
  isLoadingUsers = true;
  isLoadingHistory = false;

  public unreadCounts = new Map<number, number>();

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.currentUser = {
        id: user.id,
        name: user.nome_de_guerra || user.name,
      };
    }

    // A conexão já foi estabelecida pelo AppComponent.
    // Apenas carregamos os dados necessários para esta página.
    this.loadUsers();
    this.loadInitialUnreadCounts();

    this.chatService.messages$.subscribe((message: ChatMessage) => {
      const messagePayload = message.payload || message;

      // Se a mensagem recebida pertence à conversa ativa, exibe-a
      if (
        this.selectedUser &&
        messagePayload.senderId === this.selectedUser.id
      ) {
        messagePayload.isMe = false;
        this.activeConversationMessages.push(messagePayload);
        // Como o chat está aberto, marca a mensagem como lida imediatamente
        this.markConversationAsRead(this.selectedUser.id);
      } else {
        // Se não, incrementa o contador de não lidos para o remetente na lista
        if (messagePayload.senderId) {
          const currentCount =
            this.unreadCounts.get(messagePayload.senderId) || 0;
          this.unreadCounts.set(messagePayload.senderId, currentCount + 1);
        }
      }
    });
  }

  // A conexão não é mais fechada aqui para permitir a navegação sem perdê-la.
  // Ela só é fechada no logout.
  ngOnDestroy(): void {}

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  loadUsers(): void {
    this.userService.getUsers().subscribe((allUsers) => {
      this.users = allUsers.filter((u) => u.id !== this.currentUser?.id);
      this.isLoadingUsers = false;
    });
  }

  loadInitialUnreadCounts(): void {
    this.chatService
      .getUnreadCountsPerUser()
      .subscribe((counts: { [senderId: number]: number }) => {
        this.unreadCounts.clear();
        for (const senderId in counts) {
          if (counts.hasOwnProperty(senderId)) {
            this.unreadCounts.set(Number(senderId), counts[senderId]);
          }
        }
      });
  }

  selectUser(user: ChatUser): void {
    if (this.isLoadingHistory) return;

    this.selectedUser = user;
    this.activeConversationMessages = [];
    this.isLoadingHistory = true;

    // Marca as mensagens como lidas ANTES de carregar o histórico
    this.markConversationAsRead(user.id);

    this.chatService
      .getConversationHistory(user.id)
      .subscribe((history: any[]) => {
        // Mapeamento explícito para garantir que os nomes das propriedades batem certo.
        this.activeConversationMessages = history.map((dbMsg) => {
          return {
            id: dbMsg.id,
            text: dbMsg.message_text, // Mapeamento corrigido
            sender_id: dbMsg.sender_id,
            recipient_id: dbMsg.recipient_id,
            created_at: dbMsg.created_at,
            is_read: dbMsg.is_read,
            isMe: dbMsg.sender_id === this.currentUser?.id,
          };
        });
        this.isLoadingHistory = false;
      });
  }

  markConversationAsRead(senderId: number): void {
    if (!this.unreadCounts.has(senderId)) {
      return;
    }

    // Chama o serviço para atualizar o backend e o contador global
    this.chatService.markMessagesAsRead(senderId).subscribe({
      next: () => {
        console.log(`Mensagens de ${senderId} marcadas como lidas.`);
        // Remove o contador da lista visual APENAS após o sucesso da API
        this.unreadCounts.delete(senderId);
      },
      error: (err) =>
        console.error('Falha ao marcar mensagens como lidas', err),
    });
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.selectedUser || !this.currentUser)
      return;

    const sentMessage: Pick<ChatMessage, 'text' | 'senderId' | 'recipientId'> =
      {
        text: this.newMessage,
        senderId: this.currentUser.id,
        recipientId: this.selectedUser.id,
      };

    // Adiciona a mensagem à conversa ativa instantaneamente (Atualização Otimista)
    const displayMessage: ChatMessage = {
      id: Date.now(), // ID temporário para a key do ngFor
      text: sentMessage.text,
      senderId: sentMessage.senderId,
      recipientId: sentMessage.recipientId,
      isMe: true,
      created_at: new Date().toISOString(),
    };
    this.activeConversationMessages.push(displayMessage);

    this.chatService.sendMessage(sentMessage);
    this.newMessage = '';
  }

  scrollToBottom(): void {
    try {
      this.messageContainer.nativeElement.scrollTop =
        this.messageContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }
}
