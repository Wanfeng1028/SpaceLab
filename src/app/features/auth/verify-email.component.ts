import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="verify-page">
      <div class="verify-card">
        @if (loading()) {
          <div class="verify-icon verify-icon--loading">⏳</div>
          <h1 class="verify-title">正在验证邮箱...</h1>
          <p class="verify-desc">请稍候，正在验证您的邮箱地址。</p>
        }

        @if (success()) {
          <div class="verify-icon verify-icon--success">✅</div>
          <h1 class="verify-title">邮箱验证成功！</h1>
          <p class="verify-desc">您的邮箱已成功验证，现在可以使用所有功能。</p>
          <a routerLink="/profile" class="verify-btn">进入个人中心</a>
        }

        @if (error()) {
          <div class="verify-icon verify-icon--error">❌</div>
          <h1 class="verify-title">验证失败</h1>
          <p class="verify-desc">{{ error() }}</p>
          <div class="verify-actions">
            <a routerLink="/login" class="verify-btn">返回登录</a>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .verify-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      padding: 24px;
    }

    .verify-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: 24px;
      padding: 48px 40px;
      text-align: center;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    }

    .verify-icon {
      font-size: 56px;
      margin-bottom: 20px;
    }

    .verify-title {
      font-size: 24px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 12px;
    }

    .verify-desc {
      font-size: 15px;
      color: #64748b;
      line-height: 1.6;
      margin: 0 0 28px;
    }

    .verify-btn {
      display: inline-block;
      padding: 12px 32px;
      background: linear-gradient(135deg, #1e40af, #2563eb);
      color: #ffffff;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s;
    }

    .verify-btn:hover {
      background: linear-gradient(135deg, #1d4ed8, #3b82f6);
      box-shadow: 0 4px 16px rgba(37, 99, 235, 0.4);
      transform: translateY(-1px);
    }

    .verify-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyEmailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  loading = signal(true);
  success = signal(false);
  error = signal('');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.loading.set(false);
      this.error.set('缺少验证令牌，请检查邮件中的链接是否完整。');
      return;
    }

    this.authService.verifyEmail(token).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
        // 刷新用户信息
        this.authService.getMe().subscribe();
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.error || '验证失败，链接可能已过期，请重新发送验证邮件。');
      }
    });
  }
}
