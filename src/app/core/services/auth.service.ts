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

  register(email: string, password: string, username: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, {
      email,
      password,
      username
    }).pipe(
      tap(response => this.storeAuthData(response))
    );
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, {
      email,
      password
    }).pipe(
      tap(response => this.storeAuthData(response))
    );
  }

  logout(): void {
    this.clearAuth();
    this.router.navigate(['/']);
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
