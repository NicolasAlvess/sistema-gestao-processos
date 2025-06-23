import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service'; // <-- Importar o serviço

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  credentials = { email: '', password: '' };
  errorMessage = '';

  // Injetar o AuthService no lugar do HttpClient
  constructor(private authService: AuthService, private router: Router) {}

  onSubmit() {
    this.authService.login(this.credentials).subscribe({
      next: () => {
        // A lógica de sucesso agora é apenas navegar
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.errorMessage = 'Email ou senha inválidos. Tente novamente.';
        console.error('Erro no login', err);
      }
    });
  }
}
