import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="reset-page">
      <div class="reset-card">
        @if (!token) {
          <div class="reset-icon">❌</div>
          <h1 class="reset-title">链接无效</h1>
          <p class="reset-desc">缺少重置令牌，请检查邮件中的链接是否完整。</p>
          <a routerLink="/login" class="reset-btn">返回登录</a>
        } @else if (success()) {
          <div class="reset-icon">✅</div>
          <h1 class="reset-title">密码已重置</h1>
          <p class="reset-desc">您的密码已成功重置，请使用新密码登录。</p>
          <a routerLink="/login" class="reset-btn">前往登录</a>
        } @else {
          <div class="reset-icon">🔑</div>
          <h1 class="reset-title">重置密码</h1>
          <p class="reset-desc">请输入您的新密码</p>

          @if (error()) {
            <div class="reset-error">{{ error() }}</div>
          }

          <form (ngSubmit)="onSubmit()" class="reset-form">
            <div class="reset-field">
              <input
                [type]="showPassword() ? 'text' : 'password'"
                [value]="newPassword()"
                (input)="newPassword.set($any($event.target).value)"
                placeholder="新密码（至少8位，含大小写字母和数字）"
                class="reset-input"
                required
                autocomplete="new-password"
              />
              <button type="button" class="reset-toggle" (click)="showPassword.update(v => !v)">
                {{ showPassword() ? '🙈' : '👁️' }}
              </button>
            </div>

            <div class="reset-field">
              <input
                type="password"
                [value]="confirmPassword()"
                (input)="confirmPassword.set($any($event.target).value)"
                placeholder="确认新密码"
                class="reset-input"
                required
                autocomplete="new-password"
              />
            </div>

            <button type="submit" class="reset-btn" [disabled]="loading()">
              {{ loading() ? '重置中...' : '重置密码' }}
            </button>
          </form>
        }
      </div>
    </div>
  `,
  styles: [`
    .reset-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      padding: 24px;
    }

    .reset-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: 24px;
      padding: 48px 40px;
      text-align: center;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    }

    .reset-icon {
      font-size: 56px;
      margin-bottom: 20px;
    }

    .reset-title {
      font-size: 24px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 12px;
    }

    .reset-desc {
      font-size: 15px;
      color: #64748b;
      line-height: 1.6;
      margin: 0 0 28px;
    }

    .reset-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 14px;
      color: #991b1b;
      margin-bottom: 16px;
    }

    .reset-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .reset-field {
      position: relative;
    }

    .reset-input {
      width: 100%;
      padding: 14px 16px;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      font-size: 15px;
      background: #f8fafc;
      transition: border-color 0.2s;
      box-sizing: border-box;
    }

    .reset-input:focus {
      outline: none;
      border-color: #3b82f6;
      background: #ffffff;
    }

    .reset-toggle {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      padding: 4px;
    }

    .reset-btn {
      display: inline-block;
      padding: 13px 32px;
      background: linear-gradient(135deg, #1e40af, #2563eb);
      color: #ffffff;
      border: none;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s;
    }

    .reset-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #1d4ed8, #3b82f6);
      box-shadow: 0 4px 16px rgba(37, 99, 235, 0.4);
      transform: translateY(-1px);
    }

    .reset-btn:disabled {
      background: linear-gradient(135deg, #93c5fd, #bfdbfe);
      cursor: not-allowed;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  token: string | null = null;
  newPassword = signal('');
  confirmPassword = signal('');
  showPassword = signal(false);
  loading = signal(false);
  success = signal(false);
  error = signal('');

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');
  }

  onSubmit(): void {
    if (!this.token) {
      this.error.set('缺少重置令牌');
      return;
    }

    if (!this.newPassword() || !this.confirmPassword()) {
      this.error.set('请填写所有字段');
      return;
    }

    const pwdError = this.authService.validatePassword(this.newPassword());
    if (pwdError) {
      this.error.set(pwdError);
      return;
    }

    if (this.newPassword() !== this.confirmPassword()) {
      this.error.set('两次输入的密码不一致');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.authService.resetPassword(this.token, this.newPassword()).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.error || '重置失败，链接可能已过期');
      }
    });
  }
}
