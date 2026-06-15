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

  /** 第三方登录弹窗提示 */
  thirdPartyDialogVisible = signal(false);
  thirdPartyName = signal('');

  onSubmit(): void {
    if (!this.email() || !this.username() || !this.password()) {
      this.error.set('请填写所有必填字段');
      return;
    }

    if (this.password() !== this.confirmPassword()) {
      this.error.set('两次输入的密码不一致');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.authService.register(this.email(), this.password(), this.username()).subscribe({
      next: (response) => {
        this.loading.set(false);
        const isAdmin = response.user?.role === 'admin';
        this.router.navigate(isAdmin ? ['/admin'] : ['/profile']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.error || '注册失败，请稍后重试');
      }
    });
  }

  showThirdPartyHint(name: string): void {
    this.thirdPartyName.set(name);
    this.thirdPartyDialogVisible.set(true);
  }

  closeThirdPartyDialog(): void {
    this.thirdPartyDialogVisible.set(false);
  }
}
