import { Injectable, inject, signal, computed } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap, catchError, of, distinctUntilChanged } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  status: string;
  avatar_url?: string;
  email_verified_at?: string;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  refresh_token: string;
  user: User;
  expires_at: string;
}

/** 认证状态三态 */
export type AuthState = 'checking' | 'authenticated' | 'anonymous';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = environment.apiUrl;

  /** 访问令牌过期时间戳（毫秒），用于标签页可见时主动续期 */
  private tokenExpiryAt: number | null = null;

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  /** 认证状态三态 signal */
  readonly authState = signal<AuthState>('checking');

  /** 认证状态 Observable，供 guard 等待使用 */
  readonly authState$ = toObservable(this.authState);

  /** 响应式登录状态 signal，供模板绑定 */
  readonly isLoggedInSig = computed(() => this.authState() === 'authenticated');

  /** 当前用户 signal */
  readonly currentUserSig = signal<User | null>(null);

  constructor() {
    this.restoreSession();
    this.initProactiveRefresh();
  }

  /** 启动时恢复会话：本地有 token 即乐观视为已登录，避免刷新页面瞬间被误登出 */
  private restoreSession(): void {
    const token = this.getRawToken();
    if (!token) {
      this.authState.set('anonymous');
      return;
    }

    // 先从 localStorage 恢复用户信息（快速显示，避免刷新后闪烁/跳登录页）
    const userStr = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null;
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUserSubject.next(user);
        this.currentUserSig.set(user);
      } catch {
        // ignore parse error
      }
    }

    // 恢复过期时间，供标签页可见时主动续期
    const expStr = typeof localStorage !== 'undefined' ? localStorage.getItem('token_expires_at') : null;
    if (expStr) {
      const t = Number(expStr);
      this.tokenExpiryAt = Number.isFinite(t) ? t : null;
    }

    // 乐观地先置为已登录：只要本地存在 token，就认为已登录，
    // 避免刷新页面瞬间 /auth/me 偶发失败（后端重启/网络抖动/代理未就绪）导致被误登出。
    // 真正的有效性由后续请求 + 拦截器自动刷新来保证；若 token 确已失效，
    // 拦截器刷新失败会再置为 anonymous。
    this.authState.set('authenticated');

    // 后台静默校验并刷新最新用户信息（失败也不清登出，交给拦截器统一处理）
    this.http.get<User>(`${this.apiUrl}/auth/me`).subscribe({
      next: (user) => {
        this.currentUserSubject.next(user);
        this.currentUserSig.set(user);
        this.authState.set('authenticated');
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(user));
        }
      },
      error: () => {
        // 不再主动 clearAuth：401 由拦截器自动刷新；其它瞬时错误保持乐观登录态，
        // 待下一次真实请求再决定是否需要重新登录。
      },
    });
  }

  /**
   * 当标签页重新可见 / 窗口聚焦，且访问令牌即将过期时主动续期，
   * 避免用户空闲后被静默登出（#5 可见性续期）。
   */
  private initProactiveRefresh(): void {
    if (typeof document === 'undefined') return;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      this.proactiveRefreshIfNeeded();
    };
    document.addEventListener('visibilitychange', onVisible);
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onVisible);
    }
  }

  private proactiveRefreshIfNeeded(): void {
    if (this.authState() !== 'authenticated') return;
    if (!this.tokenExpiryAt) return;
    const bufferMs = 5 * 60 * 1000; // 过期前 5 分钟触发续期
    if (Date.now() > this.tokenExpiryAt - bufferMs) {
      this.refreshNow();
    }
  }

  private refreshNow(): void {
    const refreshToken =
      typeof localStorage !== 'undefined' ? localStorage.getItem('refresh_token') : null;
    if (!refreshToken) return;
    this.refreshToken(refreshToken).subscribe({
      next: (response) => this.storeAuthData(response),
      error: () => this.clearAuth(),
    });
  }

  /** 用 refresh_token 换新 token（公开，供 interceptor 调用） */
  refreshToken(refreshTokenStr: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/refresh`, {
      refresh_token: refreshTokenStr
    });
  }

  /** 存储 token 和用户信息（公开，供 interceptor 调用） */
  storeAuthData(response: AuthResponse): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('token', response.token);
      localStorage.setItem('refresh_token', response.refresh_token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    this.currentUserSubject.next(response.user);
    this.currentUserSig.set(response.user);
    this.authState.set('authenticated');
    if (response.expires_at) {
      const t = new Date(response.expires_at).getTime();
      this.tokenExpiryAt = Number.isFinite(t) ? t : null;
      if (typeof localStorage !== 'undefined' && this.tokenExpiryAt) {
        localStorage.setItem('token_expires_at', String(this.tokenExpiryAt));
      }
    }
  }

  /** 清理登录状态（公开，供 interceptor/guard 调用） */
  clearAuth(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('token_expires_at');
    }
    this.currentUserSubject.next(null);
    this.currentUserSig.set(null);
    this.authState.set('anonymous');
  }

  register(email: string, password: string, username: string, captchaToken?: string, captchaId?: string, captchaAnswer?: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, {
      email,
      password,
      username,
      captcha_token: captchaToken || '',
      captcha_id: captchaId || '',
      captcha_answer: captchaAnswer || '',
    }).pipe(
      tap(response => this.storeAuthData(response))
    );
  }

  login(email: string, password: string, captchaToken?: string, captchaId?: string, captchaAnswer?: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, {
      email,
      password,
      captcha_token: captchaToken || '',
      captcha_id: captchaId || '',
      captcha_answer: captchaAnswer || '',
    }).pipe(
      tap(response => this.storeAuthData(response))
    );
  }

  logout(): void {
    // 尝试服务端撤销 Token
    this.http.post(`${this.apiUrl}/auth/logout`, {}).pipe(
      catchError(() => of(null))
    ).subscribe({
      complete: () => {
        this.clearAuth();
        this.router.navigate(['/']);
      }
    });
  }

  isAdmin(): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === 'admin';
  }

  isWriter(): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === 'admin' || user?.role === 'writer';
  }

  /** 获取原始 token（不触发验证） */
  getRawToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem('token');
  }

  /** 保留旧接口兼容 */
  getToken(): string | null {
    return this.getRawToken();
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  updateProfile(username: string, avatarUrl: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/auth/profile`, {
      username,
      avatar_url: avatarUrl
    });
  }

  updatePassword(oldPassword: string, newPassword: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/auth/password`, {
      old_password: oldPassword,
      new_password: newPassword
    });
  }

  /** 检查注册是否开放 */
  isRegistrationOpen(): Observable<{ registration_open: boolean }> {
    return this.http.get<{ registration_open: boolean }>(`${this.apiUrl}/auth/registration-open`);
  }

  /** 请求密码重置邮件 */
  requestPasswordReset(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/request-password-reset`, { email });
  }

  /** 使用 token 重置密码 */
  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/reset-password`, {
      token,
      new_password: newPassword
    });
  }

  /** 验证邮箱 */
  verifyEmail(token: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/verify-email`, { token });
  }

  /** 重新发送验证邮件（需登录） */
  resendVerificationEmail(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/resend-verification`, {});
  }

  /**
   * 密码强度评估（前端辅助校验）
   * 返回 0-4 分：0=极弱, 1=弱, 2=一般, 3=强, 4=极强
   */
  evaluatePasswordStrength(password: string): { score: number; label: string; color: string } {
    if (!password) return { score: 0, label: '', color: '' };

    let score = 0;
    const len = password.length;

    // 长度评分
    if (len >= 8) score++;
    if (len >= 12) score++;
    if (len >= 16) score++;

    // 字符种类
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecial = /[^a-zA-Z0-9]/.test(password);

    const varietyCount = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;
    if (varietyCount >= 3) score++;
    if (varietyCount >= 4) score++;

    // 常见弱密码惩罚
    const weakPasswords = ['123456', 'password', 'qwerty', 'abc123', '111111', '12345678', 'letmein', 'admin'];
    if (weakPasswords.includes(password.toLowerCase())) {
      score = Math.min(score, 1);
    }

    // 连续字符惩罚
    if (/(.)\1{2,}/.test(password)) {
      score = Math.max(0, score - 1);
    }

    score = Math.min(4, Math.max(0, score));

    const labels = ['', '弱', '一般', '强', '极强'];
    const colors = ['', '#ff4d4f', '#faad14', '#52c41a', '#1890ff'];

    return {
      score,
      label: labels[score] || '',
      color: colors[score] || '',
    };
  }

  /** 前端密码格式校验（与后端保持一致） */
  validatePassword(password: string): string | null {
    if (!password) return '请输入密码';
    if (password.length < 8) return '密码至少 8 个字符';
    if (password.length > 128) return '密码最多 128 个字符';
    if (!/[A-Z]/.test(password)) return '密码必须包含大写字母';
    if (!/[a-z]/.test(password)) return '密码必须包含小写字母';
    if (!/[0-9]/.test(password)) return '密码必须包含数字';
    return null;
  }

  getMe(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/auth/me`).pipe(
      tap(user => {
        this.currentUserSubject.next(user);
        this.currentUserSig.set(user);
        this.authState.set('authenticated');
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(user));
        }
      })
    );
  }

  // ── OAuth ───────────────────────────────────────────────────────────

  /** 跳转到后端 OAuth 发起端点，由后端 302 重定向到 Google/GitHub */
  loginWithOAuth(provider: 'google' | 'github'): void {
    // 直接 window.location 跳转，经过 proxy 转发到后端
    window.location.href = `${this.apiUrl}/auth/${provider}`;
  }

  /** 从 URL hash 解析 OAuth 回调 token，完成登录 */
  handleOAuthCallback(): { success: boolean; error?: string } {
    const hash = window.location.hash;
    if (!hash || !hash.includes('token=')) {
      return { success: false, error: '缺少授权参数' };
    }

    const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
    const token = params.get('token');
    const refreshToken = params.get('refresh_token');
    const error = params.get('error');

    if (error) {
      // 清理 hash
      window.history.replaceState(null, '', window.location.pathname);
      return { success: false, error: decodeURIComponent(error) };
    }

    if (!token || !refreshToken) {
      window.history.replaceState(null, '', window.location.pathname);
      return { success: false, error: '授权失败，缺少 token' };
    }

    // 存储 token
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('token', token);
      localStorage.setItem('refresh_token', refreshToken);
    }

    // 立即置为已登录，避免 getMe() 返回前 guard 误跳 login
    this.authState.set('authenticated');

    // 清理 hash
    window.history.replaceState(null, '', window.location.pathname);

    // 异步拉取用户信息并更新状态
    this.getMe().subscribe({
      next: () => {},
      error: () => this.clearAuth(),
    });

    return { success: true };
  }
}
