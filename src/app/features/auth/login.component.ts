import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
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
  private route = inject(ActivatedRoute);

  email = signal('');
  password = signal('');
  error = signal('');
  loading = signal(false);

  /** 第三方登录弹窗提示 */
  thirdPartyDialogVisible = signal(false);
  thirdPartyName = signal('');

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
        // 获取 redirect 参数
        const redirect = this.route.snapshot.queryParamMap.get('redirect') || '';
        // 登录成功，管理员跳管理后台，普通用户跳 redirect 或个人中心
        const isAdmin = response.user?.role === 'admin';
        if (redirect) {
          this.router.navigateByUrl(redirect);
        } else {
          this.router.navigate(isAdmin ? ['/admin'] : ['/profile']);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.error || '登录失败，请检查邮箱和密码');
      }
    });
  }

  /** 显示第三方登录暂未接入提示 */
  showThirdPartyHint(name: string): void {
    this.thirdPartyName.set(name);
    this.thirdPartyDialogVisible.set(true);
  }

  closeThirdPartyDialog(): void {
    this.thirdPartyDialogVisible.set(false);
  }
}
