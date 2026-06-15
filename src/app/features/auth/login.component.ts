import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = signal('');
  password = signal('');
  error = signal('');
  loading = signal(false);

  onSubmit(): void {
    if (!this.email() || !this.password()) {
      this.error.set('请输入邮箱和密码');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.authService.login(this.email(), this.password()).subscribe({
      next: (response) => {
        this.loading.set(false);
        // 登录成功，管理员跳管理后台，普通用户跳个人中心
        const isAdmin = response.user?.role === 'admin';
        this.router.navigate(isAdmin ? ['/admin'] : ['/profile']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.error || '登录失败，请检查邮箱和密码');
      }
    });
  }
}
