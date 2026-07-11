import { Routes } from '@angular/router';
import { adminGuard } from './admin/auth/admin.guard';

/**
 * Routes de l'application.
 *  - Les pages publiques partagent la mise en page publique (en-tête/pied).
 *  - L'espace admin a sa propre mise en page et est protégé par un guard.
 * Tout est en chargement différé (lazy loading).
 */
export const routes: Routes = [
  // --- Site public ---
  {
    path: '',
    loadComponent: () =>
      import('./public/public-layout/public-layout').then((m) => m.PublicLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./public/home/home').then((m) => m.HomeComponent),
        title: 'GK SupportIT — Réparation informatique à domicile à Ottawa',
      },
      {
        path: 'services',
        loadComponent: () => import('./public/services/services').then((m) => m.ServicesComponent),
        title: 'Services — GK SupportIT',
      },
      {
        path: 'decrire',
        loadComponent: () =>
          import('./public/describe-problem/describe-problem').then(
            (m) => m.DescribeProblemComponent,
          ),
        title: 'Décrire mon problème — GK SupportIT',
      },
      {
        path: 'a-propos',
        loadComponent: () => import('./public/about/about').then((m) => m.AboutComponent),
        title: 'À propos — GK SupportIT',
      },
      {
        path: 'contact',
        loadComponent: () => import('./public/contact/contact').then((m) => m.ContactComponent),
        title: 'Contact — GK SupportIT',
      },
    ],
  },

  // --- Carte de visite numérique (page publique autonome, sans en-tête/pied) ---
  {
    path: 'carte/:slug',
    loadComponent: () => import('./public/carte/carte').then((m) => m.CarteComponent),
    title: 'Carte de visite — GK SupportIT',
  },

  // --- Espace administrateur ---
  {
    path: 'admin/login',
    loadComponent: () => import('./admin/login/login').then((m) => m.LoginComponent),
    title: 'Connexion admin — GK SupportIT',
  },
  {
    path: 'admin',
    loadComponent: () => import('./admin/layout/admin-layout').then((m) => m.AdminLayoutComponent),
    canActivate: [adminGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./admin/dashboard/dashboard').then((m) => m.DashboardComponent),
        title: 'Tableau de bord — GK SupportIT',
      },
      {
        path: 'demandes',
        loadComponent: () => import('./admin/demandes/demandes').then((m) => m.DemandesComponent),
        title: 'Demandes — GK SupportIT',
      },
      {
        path: 'tresorerie',
        loadComponent: () =>
          import('./admin/tresorerie/tresorerie').then((m) => m.TresorerieComponent),
        title: 'Trésorerie — GK SupportIT',
      },
      {
        path: 'interventions',
        loadComponent: () =>
          import('./admin/interventions/interventions').then((m) => m.InterventionsComponent),
        title: 'Interventions — GK SupportIT',
      },
      {
        path: 'depannage',
        loadComponent: () => import('./admin/depannage/depannage').then((m) => m.DepannageComponent),
        title: 'Dépannage guidé — GK SupportIT',
      },
      {
        path: 'offres',
        loadComponent: () => import('./admin/offres/offres').then((m) => m.OffresComponent),
        title: 'Offres & affiches — GK SupportIT',
      },
      {
        path: 'cartes',
        loadComponent: () => import('./admin/cartes/cartes').then((m) => m.CartesComponent),
        title: 'Cartes de visite — GK SupportIT',
      },
      {
        path: 'parametres',
        loadComponent: () =>
          import('./admin/parametres/parametres').then((m) => m.ParametresComponent),
        title: 'Paramètres — GK SupportIT',
      },
    ],
  },

  // Redirection de secours vers l'accueil.
  { path: '**', redirectTo: '' },
];
