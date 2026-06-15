import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = signal('');
  username = signal('');
  password = signal('');
  confirmPassword = signal('');
  error = signal('');
  loading = signal(false);

  onSubmit(): void {
    // 验证
    if (!this.email() || !this.username() || !this.password()) {
      this.error.set('请填写所有必填字段');
      return;
    }

    if (this.password() !== this.confirmPassword()) {
      this.error.set('两次输入的密码不一致');
      return;
    }

    if (this.password().length < 6) {
      this.error.set('密码长度至少为 6 位');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.authService.register(this.email(), this.password(), this.username()).subscribe({
      next: (response) => {
        this.loading.set(false);
        // 注册成功，管理员跳管理后台，普通用户跳首页
        const isAdmin = response.user?.role === 'admin';
        this.router.navigate(isAdmin ? ['/admin'] : ['/']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.error || '注册失败，请稍后重试');
      }
    });
  }
}
