import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { CaptchaService } from '../../core/services/captcha.service';

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
  private captchaService = inject(CaptchaService);

  email = signal('');
  username = signal('');
  password = signal('');
  confirmPassword = signal('');
  error = signal('');
  loading = signal(false);
  showPassword = signal(false);
  registrationClosed = signal(false);

  /** 图形验证码 */
  captchaId = signal('');
  captchaImageUrl = signal('');
  captchaAnswer = signal('');

  /** 验证码加载状态 */
  captchaLoading = signal(false);

  passwordStrength = computed(() => this.authService.evaluatePasswordStrength(this.password()));

  passwordError = computed(() => {
    const p = this.password();
    if (!p) return '';
    return this.authService.validatePassword(p) || '';
  });

  confirmPasswordError = computed(() => {
    const p = this.password();
    const cp = this.confirmPassword();
    if (!cp) return '';
    return p !== cp ? '两次输入的密码不一致' : '';
  });

  emailError = computed(() => {
    const e = this.email();
    if (!e) return '';
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(e) ? '' : '请输入有效的邮箱地址';
  });

  usernameError = computed(() => {
    const u = this.username();
    if (!u) return '';
    if (u.length < 2) return '用户名至少 2 个字符';
    if (u.length > 50) return '用户名最多 50 个字符';
    const blacklist = /admin|root|system|http|https|www|\.com|<|>/i;
    if (blacklist.test(u)) return '用户名包含不允许的内容';
    return '';
  });

  formValid = computed(() => {
    return this.email() && this.username() && this.password() && this.confirmPassword()
      && !this.emailError() && !this.usernameError() && !this.passwordError() && !this.confirmPasswordError();
  });

  thirdPartyDialogVisible = signal(false);
  thirdPartyName = signal('');

  /** 图形验证码重试计数 */
  private captchaRetryCount = 0;
  private readonly captchaMaxRetries = 3;

  ngOnInit(): void {
    this.authService.isRegistrationOpen().subscribe({
      next: (res) => {
        if (!res.registration_open) {
          this.registrationClosed.set(true);
          this.error.set('注册功能暂时关闭');
        }
      },
      error: () => {}
    });
    this.loadCaptcha();
  }

  loadCaptcha(): void {
    if (this.captchaLoading()) return;
    this.captchaLoading.set(true);

    this.captchaService.getNew().subscribe({
      next: (session) => {
        this.captchaLoading.set(false);
        this.captchaRetryCount = 0;
        this.captchaId.set(session.captcha_id);
        this.captchaImageUrl.set(session.imageUrl);
        this.captchaAnswer.set('');
      },
      error: (err) => {
        this.captchaLoading.set(false);
        console.warn('[Captcha] Failed to load captcha:', err?.status || err);
        // 429 限流时 10 秒后重试，最多重试 3 次，避免无限循环
        if (err?.status === 429 && this.captchaRetryCount < this.captchaMaxRetries) {
          this.captchaRetryCount++;
          setTimeout(() => this.loadCaptcha(), 10000);
        }
      }
    });
  }

  onSubmit(): void {
    if (this.registrationClosed()) return;
    if (!this.email() || !this.username() || !this.password()) {
      this.error.set('请填写所有必填字段');
      return;
    }
    if (this.emailError()) { this.error.set(this.emailError()); return; }
    if (this.usernameError()) { this.error.set(this.usernameError()); return; }
    const pwdErr = this.authService.validatePassword(this.password());
    if (pwdErr) { this.error.set(pwdErr); return; }
    if (this.password() !== this.confirmPassword()) {
      this.error.set('两次输入的密码不一致');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.authService.register(this.email(), this.password(), this.username(), undefined, this.captchaId(), this.captchaAnswer()).subscribe({
      next: (response) => {
        this.loading.set(false);
        const isAdmin = response.user?.role === 'admin';
        this.router.navigate(isAdmin ? ['/admin'] : ['/profile']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.error || '注册失败，请稍后重试');
        if (err.error?.error?.includes('captcha')) {
          this.loadCaptcha();
        }
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