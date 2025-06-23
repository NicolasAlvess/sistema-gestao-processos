/*
 * ==========================================================================
 * FICHEIRO: frontend/src/app/pages/chat/chat.service.ts (Atualizado)
 * ==========================================================================
 * - Adicionada lógica completa para contagem de mensagens não lidas.
 * - Usa um BehaviorSubject para a contagem em tempo real.
 * - Adicionados métodos para buscar a contagem e marcar mensagens como lidas.
 * - Conexão WebSocket agora atualiza a contagem de não lidas.
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthService } from '../../auth/auth.service';

// Interface para as mensagens, mantida como no seu original
export interface ChatMessage {
  id?: number;
  text: string;
  sender_id?: number; // Corrigido para corresponder ao backend
  senderId?: number;
  senderName?: string;
  recipient_id?: number; // Corrigido para corresponder ao backend
  recipientId?: number;
  is_read?: boolean; // Corrigido para corresponder ao backend
  isMe?: boolean;
  created_at?: string; // Corrigido para corresponder ao backend
  time?: string;
  type?: 'chat_message'; // Para distinguir a mensagem
  payload?: any; // Para encapsular dados, se necessário
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private apiUrl = 'http://localhost:3000/api/chat';
  private socket!: WebSocket;

  // Subject para as mensagens da conversa ativa (como no seu original)
  private messageSubject = new Subject<ChatMessage>();
  public messages$ = this.messageSubject.asObservable();

  // ✨ NOVO: BehaviorSubject para a contagem de mensagens não lidas.
  // Começa com 0 e qualquer componente pode subscrever para obter o valor mais recente.
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient, private authService: AuthService) {}

  // --- MÉTODOS DE WEBSOCKET (Sua lógica original, com uma pequena adição) ---

  public connect(userId: number): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('WebSocket já está conectado.');
      return;
    }

    // Busca a contagem inicial de mensagens não lidas ao conectar
    this.fetchInitialUnreadCount();

    this.socket = new WebSocket(`ws://localhost:3000?userId=${userId}`);

    this.socket.onopen = () => console.log('Conexão WebSocket estabelecida.');
    this.socket.onclose = () => console.log('Conexão WebSocket fechada.');
    this.socket.onerror = (error) =>
      console.error('Erro na conexão WebSocket:', error);

    this.socket.onmessage = (event) => {
      const message: ChatMessage = JSON.parse(event.data);

      // Envia a mensagem para a janela de chat ativa
      this.messageSubject.next(message);

      // ✨ NOVO: Atualiza a contagem de mensagens não lidas em tempo real
      if (message.type === 'chat_message') {
        // Apenas incrementa se a mensagem não for do próprio utilizador
        const currentUserId = this.authService.getUserId();
        if (message.payload.senderId !== currentUserId) {
          const currentCount = this.unreadCountSubject.getValue();
          this.unreadCountSubject.next(currentCount + 1);
        }
      }
    };
  }

  // ===============================================================
  // ✨ FUNÇÃO SENDMESSAGE COM DEPURADOR ✨
  // ===============================================================
  public sendMessage(message: any): void {
    console.log('8. chatService.sendMessage() foi chamado com:', message);

    console.log('9. Verificando estado do WebSocket...', {
      socketExists: !!this.socket,
      readyState: this.socket?.readyState,
    });

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const messageToSend = {
        type: 'chat_message',
        payload: message,
      };

      console.log(
        '10. WebSocket está aberto. Enviando JSON pela rede:',
        JSON.stringify(messageToSend)
      );
      this.socket.send(JSON.stringify(messageToSend));
      console.log('11. Envio concluído com sucesso!');
    } else {
      console.error(
        'ERRO: WebSocket não está aberto ou não existe. Mensagem não enviada.'
      );
    }
  }

  public close(): void {
    if (this.socket) {
      this.socket.close();
    }
  }

  // --- MÉTODOS PARA O HISTÓRICO E CONTAGEM DE NÃO LIDAS ---

  /**
   * Obtém o histórico da conversa com outro utilizador.
   * @param otherUserId O ID do outro utilizador.
   */
  public getConversationHistory(
    otherUserId: number
  ): Observable<ChatMessage[]> {
    // A rota correta é /:userId, não /history/:otherUserId
    return this.http.get<ChatMessage[]>(`${this.apiUrl}/${otherUserId}`);
  }

  /**
   * ✨ NOVO: Busca a contagem inicial de mensagens não lidas para o utilizador logado.
   * Deve ser chamado uma vez, quando a aplicação inicia.
   */
  public fetchInitialUnreadCount(): void {
    this.http.get<{ count: number }>(`${this.apiUrl}/unread/count`).subscribe({
      next: (res) => {
        this.unreadCountSubject.next(res.count);
      },
      error: (err) => {
        console.error('Falha ao buscar contagem de mensagens não lidas.', err);
        this.unreadCountSubject.next(0); // Zera em caso de erro
      },
    });
  }

  /**
   * ✨ NOVO: Marca as mensagens de uma conversa como lidas.
   * Deve ser chamado quando o utilizador abre uma janela de chat.
   * @param senderId O ID do utilizador cujas mensagens serão marcadas como lidas.
   */
  public markMessagesAsRead(senderId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/mark-as-read`, { senderId }).pipe(
      tap(() => {
        // Após marcar como lido, atualizamos a contagem global para refletir a mudança.
        this.fetchInitialUnreadCount();
      })
    );
  }

  // Adicione este método dentro da classe ChatService

  /**
   * ✨ NOVO MÉTODO (EM FALTA): Busca a contagem de não lidas para cada utilizador.
   */
  public getUnreadCountsPerUser(): Observable<{ [senderId: number]: number }> {
    return this.http.get<{ [senderId: number]: number }>(
      `${this.apiUrl}/unread/by-user`
    );
  }
}
