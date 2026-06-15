import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';

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
    path: 'profile',
    title: 'Profile — SpaceLab',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/profile.component').then((m) => m.ProfileComponent),
  },
  {
    path: 'admin',
    title: 'Admin — SpaceLab',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/admin-shell/admin-shell.component').then((m) => m.AdminShellComponent),
    children: [
      {
        path: '',
        title: 'Dashboard — SpaceLab Admin',
        loadComponent: () =>
          import('./features/admin/admin-dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent,
          ),
      },
      {
        path: 'posts',
        title: 'Posts — SpaceLab Admin',
        loadComponent: () =>
          import('./features/admin/admin-posts/admin-posts.component').then(
            (m) => m.AdminPostsComponent,
          ),
      },
      {
        path: 'write',
        title: 'Write — SpaceLab Admin',
        loadComponent: () =>
          import('./features/admin/write/write.component').then((m) => m.WriteComponent),
      },
      {
        path: 'write/:id',
        title: 'Edit — SpaceLab Admin',
        loadComponent: () =>
          import('./features/admin/write/write.component').then((m) => m.WriteComponent),
      },
      {
        path: 'users',
        title: 'Users — SpaceLab Admin',
        loadComponent: () =>
          import('./features/admin/admin-users/admin-users.component').then(
            (m) => m.AdminUsersComponent,
          ),
      },
      {
        path: 'comments',
        title: 'Comments — SpaceLab Admin',
        loadComponent: () =>
          import('./features/admin/admin-comments/admin-comments.component').then(
            (m) => m.AdminCommentsComponent,
          ),
      },
      {
        path: 'categories',
        title: 'Categories — SpaceLab Admin',
        loadComponent: () =>
          import('./features/admin/admin-categories/admin-categories.component').then(
            (m) => m.AdminCategoriesComponent,
          ),
      },
      {
        path: 'tags',
        title: 'Tags — SpaceLab Admin',
        loadComponent: () =>
          import('./features/admin/admin-tags/admin-tags.component').then(
            (m) => m.AdminTagsComponent,
          ),
      },
      {
        path: 'friend-links',
        title: 'Friend Links — SpaceLab Admin',
        loadComponent: () =>
          import('./features/admin/admin-friend-links/admin-friend-links.component').then(
            (m) => m.AdminFriendLinksComponent,
          ),
      },
      {
        path: 'analytics',
        title: 'Analytics — SpaceLab Admin',
        loadComponent: () =>
          import('./features/analytics/analytics.component').then((m) => m.AnalyticsComponent),
      },
    ],
  },
  {
    path: '**',
    title: '404 — SpaceLab',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
