import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'blog',
    loadComponent: () =>
      import('./features/blog/blog.component').then(m => m.BlogComponent),
  },
  {
    path: 'blog/:slug',
    loadComponent: () =>
      import('./features/article/article.component').then(m => m.ArticleComponent),
  },
  {
    path: 'projects',
    loadComponent: () =>
      import('./features/projects/projects.component').then(m => m.ProjectsComponent),
  },
  {
    path: 'projects/:slug',
    loadComponent: () =>
      import('./features/project-detail/project-detail.component').then(m => m.ProjectDetailComponent),
  },
  {
    path: 'lab',
    loadComponent: () =>
      import('./features/lab/lab.component').then(m => m.LabComponent),
  },
  {
    path: 'gallery',
    loadComponent: () =>
      import('./features/gallery/gallery.component').then(m => m.GalleryComponent),
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./features/about/about.component').then(m => m.AboutComponent),
  },
  {
    path: 'archive',
    loadComponent: () =>
      import('./features/archive/archive.component').then(m => m.ArchiveComponent),
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/admin.component').then(m => m.AdminComponent),
  },
  {
    path: 'admin/write',
    loadComponent: () =>
      import('./features/admin/write/write.component').then(m => m.WriteComponent),
  },
  {
    path: 'admin/write/:id',
    loadComponent: () =>
      import('./features/admin/write/write.component').then(m => m.WriteComponent),
  },
  {
    path: 'admin/analytics',
    loadComponent: () =>
      import('./features/analytics/analytics.component').then(m => m.AnalyticsComponent),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then(m => m.NotFoundComponent),
  },
];
