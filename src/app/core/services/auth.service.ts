import { Injectable, inject, signal, computed } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap, catchError, of, map, distinctUntilChanged } from 'rxjs';
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
  }

  /** 启动时恢复会话：先检查 localStorage token，再调用 /auth/me 验证 */
  private restoreSession(): void {
    const token = this.getRawToken();
    if (!token) {
      this.authState.set('anonymous');
      return;
    }

    // 有旧 token，先设为 checking，然后调 /auth/me 验证
    this.authState.set('checking');

    // 先从 localStorage 恢复用户信息（快速显示）
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

    // 异步验证 token 有效性
    this.http.get<User>(`${this.apiUrl}/auth/me`).pipe(
      catchError(() => {
        // /auth/me 失败，尝试 refresh token
        return this.tryRefresh().pipe(
          catchError(() => {
            // refresh 也失败，清理状态
            this.clearAuth();
            return of(null);
          })
        );
      })
    ).subscribe({
      next: (user) => {
        if (user) {
          this.currentUserSubject.next(user);
          this.currentUserSig.set(user);
          this.authState.set('authenticated');
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(user));
          }
        }
      },
      error: () => {
        this.clearAuth();
      }
    });
  }

  /** 尝试用 refresh_token 换新 token（内部用） */
  private tryRefresh(): Observable<User | null> {
    const refreshToken = typeof localStorage !== 'undefined' ? localStorage.getItem('refresh_token') : null;
    if (!refreshToken) {
      return of(null);
    }

    return this.refreshToken(refreshToken).pipe(
      tap((response) => {
        this.storeAuthData(response);
      }),
      map((response) => response.user),
      catchError(() => of(null))
    );
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
  }

  /** 清理登录状态（公开，供 interceptor/guard 调用） */
  clearAuth(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
    this.currentUserSubject.next(null);
    this.currentUserSig.set(null);
    this.authState.set('anonymous');
  }

  register(email: string, password: string, username: string, captchaToken?: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, {
      email,
      password,
      username,
      captcha_token: captchaToken || '',
    }).pipe(
      tap(response => this.storeAuthData(response))
    );
  }

  login(email: string, password: string, captchaToken?: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, {
      email,
      password,
      captcha_token: captchaToken || '',
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
}
