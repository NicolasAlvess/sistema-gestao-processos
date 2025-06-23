/*
 * ==========================================================================
 * FICHEIRO: frontend/src/app/auth/auth.service.ts (CORRIGIDO PARA SSR)
 * ==========================================================================
 * - Adicionada a verificação 'isPlatformBrowser' para garantir que o
 * 'localStorage' só seja acedido quando o código é executado no navegador,
 * evitando o erro "localStorage is not defined" no servidor.
 */

// ✨ 1. IMPORTAR AS FERRAMENTAS NECESSÁRIAS
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { BehaviorSubject, Observable } from 'rxjs';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/auth';
  private tokenKey = 'authToken';

  private loggedIn: BehaviorSubject<boolean>;

  // ✨ 2. INJETAR O PLATFORM_ID PARA SABER ONDE O CÓDIGO ESTÁ A CORRER
  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Inicializa o BehaviorSubject de forma segura para SSR
    this.loggedIn = new BehaviorSubject<boolean>(this.isLoggedIn());
  }

  login(credentials: any) {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response) => {
        if (response && response.token) {
          // ✨ 3. PROTEGER A ESCRITA NO LOCALSTORAGE
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem(this.tokenKey, response.token);
          }
          this.loggedIn.next(true);
        }
      })
    );
  }

  logout(): void {
    // ✨ 4. PROTEGER A REMOÇÃO DO LOCALSTORAGE
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.tokenKey);
    }
    this.loggedIn.next(false);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    // ✨ 5. PROTEGER A LEITURA DO LOCALSTORAGE
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(this.tokenKey);
    }
    return null; // No servidor, não há token
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const decoded: any = jwtDecode(token);
      return Date.now() < decoded.exp * 1000;
    } catch (error) {
      return false;
    }
  }

  getCurrentUser(): any | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      return jwtDecode(token);
    } catch (error) {
      return null;
    }
  }

  public getUserId(): number | null {
    const user = this.getCurrentUser();
    return user ? user.id : null;
  }

  public getAuthState(): Observable<boolean> {
    return this.loggedIn.asObservable();
  }

  public isAdmin(): boolean {
    const user = this.getCurrentUser();
    return !!user && user.role === 'admin';
  }

  public isGestorOrAdmin(): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    return ['gestor', 'admin'].includes(user.role);
  }

  public isAuxiliarOrAbove(): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    return ['auxiliar', 'gestor', 'admin'].includes(user.role);
  }
}
