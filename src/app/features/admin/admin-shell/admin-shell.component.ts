import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterOutlet, RouterLink } from '@angular/router';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { AuthService } from '../../../core/services/auth.service';

interface MenuLink {
  label: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, NzLayoutModule, NzMenuModule, NzIconModule, NzDropDownModule, NzAvatarModule],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShellComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  readonly isCollapsed = signal(false);
  readonly currentUser = signal(this.authService.getCurrentUser());

  readonly menuLinks: MenuLink[] = [
    { label: '仪表盘', path: '/admin', icon: 'dashboard' },
    { label: '文章管理', path: '/admin/posts', icon: 'file-text' },
    { label: '用户管理', path: '/admin/users', icon: 'team' },
    { label: '评论审核', path: '/admin/comments', icon: 'message' },
    { label: '数据分析', path: '/admin/analytics', icon: 'bar-chart' },
  ];

  toggleCollapsed(): void {
    this.isCollapsed.update((v) => !v);
  }

  onLogout(): void {
    this.authService.logout();
  }

  initials(): string {
    const u = this.currentUser();
    const name = u?.username || u?.email || '';
    return name ? name.charAt(0).toUpperCase() : 'A';
  }
}
