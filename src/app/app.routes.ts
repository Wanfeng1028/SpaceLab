import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'SpaceLab',
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'blog',
    title: 'Blog — SpaceLab',
    loadComponent: () => import('./features/blog/blog.component').then((m) => m.BlogComponent),
  },
  {
    path: 'blog/:slug',
    loadComponent: () =>
      import('./features/article/article.component').then((m) => m.ArticleComponent),
  },
  {
    path: 'projects',
    title: 'Projects — SpaceLab',
    loadComponent: () =>
      import('./features/projects/projects.component').then((m) => m.ProjectsComponent),
  },
  {
    path: 'projects/:slug',
    loadComponent: () =>
      import('./features/project-detail/project-detail.component').then(
        (m) => m.ProjectDetailComponent,
      ),
  },
  {
    path: 'lab',
    title: 'Lab — SpaceLab',
    loadComponent: () => import('./features/lab/lab.component').then((m) => m.LabComponent),
  },
  {
    path: 'ai-frontline',
    title: 'AI Frontline — SpaceLab',
    loadComponent: () =>
      import('./features/ai-frontline/ai-frontline.component').then((m) => m.AiFrontlineComponent),
  },
  {
    path: 'gallery',
    redirectTo: 'ai-frontline',
    pathMatch: 'full',
  },
  {
    path: 'about',
    title: 'About — SpaceLab',
    loadComponent: () => import('./features/about/about.component').then((m) => m.AboutComponent),
  },
  {
    path: 'archive',
    title: 'Archive — SpaceLab',
    loadComponent: () =>
      import('./features/archive/archive.component').then((m) => m.ArchiveComponent),
  },
  {
    path: 'login',
    title: 'Login — SpaceLab',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    title: 'Register — SpaceLab',
    loadComponent: () =>
      import('./features/auth/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'admin',
    title: 'Admin — SpaceLab',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/admin.component').then((m) => m.AdminComponent),
  },
  {
    path: 'admin/write',
    title: 'Write — SpaceLab Admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/write/write.component').then((m) => m.WriteComponent),
  },
  {
    path: 'admin/write/:id',
    title: 'Edit — SpaceLab Admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/write/write.component').then((m) => m.WriteComponent),
  },
  {
    path: 'admin/analytics',
    title: 'Analytics — SpaceLab Admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/analytics/analytics.component').then((m) => m.AnalyticsComponent),
  },
  {
    path: '**',
    title: '404 — SpaceLab',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
