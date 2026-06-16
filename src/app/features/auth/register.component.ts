import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { RecaptchaService } from '../../core/services/recaptcha.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private recaptcha = inject(RecaptchaService);

  email = signal('');
  username = signal('');
  password = signal('');
  confirmPassword = signal('');
  error = signal('');
  loading = signal(false);
  showPassword = signal(false);
  registrationClosed = signal(false);

  /** 密码强度 */
  passwordStrength = computed(() => this.authService.evaluatePasswordStrength(this.password()));

  /** 密码校验错误 */
  passwordError = computed(() => {
    const p = this.password();
    if (!p) return '';
    return this.authService.validatePassword(p) || '';
  });

  /** 确认密码不匹配 */
  confirmPasswordError = computed(() => {
    const p = this.password();
    const cp = this.confirmPassword();
    if (!cp) return '';
    return p !== cp ? '两次输入的密码不一致' : '';
  });

  /** 邮箱格式 */
  emailError = computed(() => {
    const e = this.email();
    if (!e) return '';
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(e) ? '' : '请输入有效的邮箱地址';
  });

  /** 用户名校验 */
  usernameError = computed(() => {
    const u = this.username();
    if (!u) return '';
    if (u.length < 2) return '用户名至少 2 个字符';
    if (u.length > 50) return '用户名最多 50 个字符';
    // 黑名单检测
    const blacklist = /admin|root|system|http|https|www|\.com|<|>/i;
    if (blacklist.test(u)) return '用户名包含不允许的内容';
    return '';
  });

  /** 整体表单是否有效 */
  formValid = computed(() => {
    return this.email() && this.username() && this.password() && this.confirmPassword()
      && !this.emailError() && !this.usernameError() && !this.passwordError() && !this.confirmPasswordError();
  });

  /** 第三方登录弹窗提示 */
  thirdPartyDialogVisible = signal(false);
  thirdPartyName = signal('');

  ngOnInit(): void {
    // 检查注册是否开放
    this.authService.isRegistrationOpen().subscribe({
      next: (res) => {
        if (!res.registration_open) {
          this.registrationClosed.set(true);
          this.error.set('注册功能暂时关闭');
        }
      },
      error: () => {
        // 默认允许注册
      }
    });
  }

  async onSubmit(): Promise<void> {
    if (this.registrationClosed()) return;

    if (!this.email() || !this.username() || !this.password()) {
      this.error.set('请填写所有必填字段');
      return;
    }

    // 前端完整校验
    if (this.emailError()) {
      this.error.set(this.emailError());
      return;
    }
    if (this.usernameError()) {
      this.error.set(this.usernameError());
      return;
    }
    const pwdErr = this.authService.validatePassword(this.password());
    if (pwdErr) {
      this.error.set(pwdErr);
      return;
    }
    if (this.password() !== this.confirmPassword()) {
      this.error.set('两次输入的密码不一致');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    // 获取 reCAPTCHA token
    const captchaToken = await this.recaptcha.execute('register');

    this.authService.register(this.email(), this.password(), this.username(), captchaToken).subscribe({
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

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  showThirdPartyHint(name: string): void {
    this.thirdPartyName.set(name);
    this.thirdPartyDialogVisible.set(true);
  }

  closeThirdPartyDialog(): void {
    this.thirdPartyDialogVisible.set(false);
  }
}
