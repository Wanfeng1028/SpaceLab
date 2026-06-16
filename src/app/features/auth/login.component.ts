import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { CaptchaService } from '../../core/services/captcha.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private captchaService = inject(CaptchaService);

  email = signal('');
  password = signal('');
  error = signal('');
  loading = signal(false);
  showPassword = signal(false);

  /** 图形验证码 */
  captchaId = signal('');
  captchaImageUrl = signal('');
  captchaAnswer = signal('');

  /** 邮箱格式校验 */
  emailError = computed(() => {
    const e = this.email();
    if (!e) return '';
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(e) ? '' : '请输入有效的邮箱地址';
  });

  /** 第三方登录弹窗提示 */
  thirdPartyDialogVisible = signal(false);
  thirdPartyName = signal('');

  /** 忘记密码弹窗 */
  forgotPasswordVisible = signal(false);
  forgotEmail = signal('');
  forgotLoading = signal(false);
  forgotSuccess = signal(false);
  forgotError = signal('');

  /** 邮箱未验证提示 */
  emailUnverified = signal(false);
  resendLoading = signal(false);
  resendSuccess = signal(false);

  ngOnInit(): void {
    this.loadCaptcha();
  }

  loadCaptcha(): void {
    this.captchaService.getNew().subscribe({
      next: (session) => {
        this.captchaId.set(session.captcha_id);
        this.captchaImageUrl.set(session.imageUrl);
        this.captchaAnswer.set('');
      },
      error: (err) => {
        console.warn('[Captcha] Failed to load captcha:', err);
      }
    });
  }

  onSubmit(): void {
    if (!this.email() || !this.password()) {
      this.error.set('请输入邮箱和密码');
      return;
    }
    if (this.emailError()) {
      this.error.set(this.emailError());
      return;
    }
    this.loading.set(true);
    this.error.set('');

    this.authService.login(this.email(), this.password(), undefined, this.captchaId(), this.captchaAnswer()).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (!response.user?.email_verified_at) {
          this.emailUnverified.set(true);
        }
        const redirect = this.route.snapshot.queryParamMap.get('redirect') || '';
        const isAdmin = response.user?.role === 'admin';
        if (redirect) {
          this.router.navigateByUrl(redirect);
        } else {
          this.router.navigate(isAdmin ? ['/admin'] : ['/profile']);
        }
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err.error?.error || '登录失败，请检查邮箱和密码';
        this.error.set(msg);
        // 验证码错误时刷新
        if (err.error?.error?.includes('captcha')) {
          this.loadCaptcha();
        }
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  openForgotPassword(): void {
    this.forgotEmail.set(this.email());
    this.forgotError.set('');
    this.forgotSuccess.set(false);
    this.forgotPasswordVisible.set(true);
  }

  closeForgotPassword(): void {
    this.forgotPasswordVisible.set(false);
  }

  submitForgotPassword(): void {
    if (!this.forgotEmail() || this.emailError()) {
      this.forgotError.set('请输入有效的邮箱地址');
      return;
    }
    this.forgotLoading.set(true);
    this.forgotError.set('');
    this.authService.requestPasswordReset(this.forgotEmail()).subscribe({
      next: () => { this.forgotLoading.set(false); this.forgotSuccess.set(true); },
      error: () => { this.forgotLoading.set(false); this.forgotSuccess.set(true); }
    });
  }

  showThirdPartyHint(name: string): void {
    this.thirdPartyName.set(name);
    this.thirdPartyDialogVisible.set(true);
  }

  closeThirdPartyDialog(): void {
    this.thirdPartyDialogVisible.set(false);
  }

  resendVerification(): void {
    this.resendLoading.set(true);
    this.resendSuccess.set(false);
    this.authService.resendVerificationEmail().subscribe({
      next: () => { this.resendLoading.set(false); this.resendSuccess.set(true); },
      error: () => { this.resendLoading.set(false); }
    });
  }

  dismissUnverified(): void {
    this.emailUnverified.set(false);
  }
}