import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

/**
 * OAuth 回调页。后端完成 OAuth 流程后 302 重定向到此路由，
 * URL hash 中携带 token / refresh_token / error。
 * 该组件解析 hash，完成登录后跳转到首页或 profile。
 */
@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="oauth-callback">
      <div class="oauth-callback__card">
        @if (loading) {
          <div class="oauth-callback__spinner"></div>
          <p class="oauth-callback__text">正在登录，请稍候...</p>
        } @else if (error) {
          <div class="oauth-callback__icon oauth-callback__icon--error">✕</div>
          <p class="oauth-callback__text oauth-callback__text--error">{{ error }}</p>
          <button class="oauth-callback__btn" (click)="gotoLogin()">返回登录</button>
        } @else {
          <div class="oauth-callback__icon oauth-callback__icon--success">✓</div>
          <p class="oauth-callback__text">登录成功，正在跳转...</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .oauth-callback {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      padding: 24px;
    }
    .oauth-callback__card {
      text-align: center;
      background: rgba(255,255,255,0.75);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255,255,255,0.8);
      border-radius: 20px;
      padding: 40px 32px;
      box-shadow: 0 16px 48px rgba(70,120,170,0.12);
      max-width: 360px;
      width: 100%;
    }
    .oauth-callback__spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(86,180,255,0.2);
      border-top-color: rgba(86,180,255,0.8);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .oauth-callback__icon {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
      margin: 0 auto 14px;
      color: #fff;
    }
    .oauth-callback__icon--success { background: #52c41a; }
    .oauth-callback__icon--error   { background: #ff4d4f; }
    .oauth-callback__text {
      font-size: 0.92rem;
      color: rgba(20,34,54,0.7);
      margin: 0;
    }
    .oauth-callback__text--error { color: #ff4d4f; margin-bottom: 14px; }
    .oauth-callback__btn {
      margin-top: 8px;
      padding: 8px 24px;
      border: 1px solid rgba(86,180,255,0.3);
      border-radius: 999px;
      background: rgba(86,180,255,0.08);
      color: rgba(86,180,255,0.9);
      font-size: 0.88rem;
      cursor: pointer;
      transition: all 200ms ease;
    }
    .oauth-callback__btn:hover {
      background: rgba(86,180,255,0.15);
    }
  `],
})
export class OAuthCallbackComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  loading = true;
  error = '';

  ngOnInit(): void {
    const result = this.authService.handleOAuthCallback();
    if (result.success) {
      // 登录成功 → 等 authState 变 authenticated 后跳转
      const check = setInterval(() => {
        if (this.authService.isLoggedInSig()) {
          clearInterval(check);
          const user = this.authService.getCurrentUser();
          this.router.navigate(user?.role === 'admin' ? ['/admin'] : ['/profile']);
        }
      }, 100);
      // 超时兜底
      setTimeout(() => {
        clearInterval(check);
        if (!this.authService.isLoggedInSig()) {
          this.loading = false;
          this.error = '登录验证超时，请重试';
        }
      }, 5000);
    } else {
      this.loading = false;
      this.error = result.error || '登录失败';
    }
  }

  gotoLogin(): void {
    this.router.navigate(['/login']);
  }
}
