import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import QRCode from 'qrcode';
import { ContentService } from '../../core/services/content.service';
import { Carte } from '../../core/models/carte.model';
import { LogoComponent } from '../../shared/logo/logo';
import { lienWhatsApp } from '../../core/utils/whatsapp.util';
import { telechargerVCard } from '../../core/utils/vcard.util';

/**
 * Page publique d'une carte de visite numérique (/carte/:slug).
 * Affiche les coordonnées, un QR code pointant vers la carte, et un bouton
 * « Ajouter à mes contacts » (téléchargement vCard). Optimisée mobile.
 */
@Component({
  selector: 'gk-carte',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LogoComponent],
  templateUrl: './carte.html',
  styleUrl: './carte.scss',
})
export class CarteComponent {
  private route = inject(ActivatedRoute);
  private content = inject(ContentService);

  readonly carte = signal<Carte | null>(null);
  readonly introuvable = signal(false);
  readonly qr = signal<string>('');
  /** Lien Instagram de l'entreprise (paramètres du site). */
  readonly instagram = signal<string>('');

  /** URL du site (page d'accueil) et de la carte courante. */
  readonly urlSite = typeof window !== 'undefined' ? window.location.origin : '';
  readonly urlCarte = typeof window !== 'undefined' ? window.location.href : '';

  constructor() {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.content.getCarte(slug).subscribe({
      next: (c) => {
        this.carte.set(c);
        this.genererQr();
      },
      error: () => this.introuvable.set(true),
    });
    // Lien Instagram de l'entreprise (facultatif).
    this.content.getSettings().subscribe((s) => this.instagram.set(s.instagram ?? ''));
  }

  private async genererQr(): Promise<void> {
    try {
      const data = await QRCode.toDataURL(this.urlCarte, {
        margin: 1,
        width: 240,
        color: { dark: '#0f2d52', light: '#ffffff' },
      });
      this.qr.set(data);
    } catch {
      /* QR non bloquant */
    }
  }

  /** Lien WhatsApp de la carte. */
  lienWa(c: Carte): string {
    return lienWhatsApp(c.whatsapp, `Bonjour ${c.nom}, `);
  }

  /** Téléchargement du contact (vCard). */
  ajouterContact(): void {
    const c = this.carte();
    if (c) telechargerVCard(c, this.urlSite);
  }
}
