import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { LogoComponent } from '../../shared/logo/logo';

/**
 * Page de connexion admin (/admin/login).
 * Envoie le mot de passe à la fonction de connexion ; en cas de succès,
 * redirige vers le tableau de bord.
 */
@Component({
  selector: 'gk-admin-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, LogoComponent],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly enCours = signal(false);
  readonly erreur = signal(false);

  readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required]],
  });

  connexion(): void {
    if (this.form.invalid) return;
    this.enCours.set(true);
    this.erreur.set(false);
    this.auth.login(this.form.getRawValue().password).subscribe((ok) => {
      this.enCours.set(false);
      if (ok) {
        this.router.navigate(['/admin/dashboard']);
      } else {
        this.erreur.set(true);
      }
    });
  }
}
