import {
  HttpInterceptorFn,
  HttpErrorResponse,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, AuthResponse } from '../services/auth.service';
import { catchError, switchMap, throwError, Observable, tap, shareReplay } from 'rxjs';

/**
 * 进行中的 refresh 请求（模块级单例），用于并发去重。
 * 多个请求同时遇到 401 时，只会真正发起一次 /auth/refresh，
 * 其余请求共享这次结果（或错误），避免旧实现里等待请求永久挂起的问题。
 */
let refreshInProgress: Observable<AuthResponse> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getRawToken();

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // 仅当已有 token 且响应为 401，且不是认证相关端点时才尝试刷新
      if (error.status === 401 && token) {
        const url = req.url;
        const isAuthEndpoint =
          url.includes('/auth/login') ||
          url.includes('/auth/register') ||
          url.includes('/auth/refresh');
        if (!isAuthEndpoint) {
          return handleTokenExpired(authService, router, req, next);
        }
      }
      return throwError(() => error);
    }),
  );
};

function handleTokenExpired(
  authService: AuthService,
  router: Router,
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> {
  const refreshToken =
    typeof localStorage !== 'undefined' ? localStorage.getItem('refresh_token') : null;

  // 没有任何 refresh_token：无法续期，直接登出
  if (!refreshToken) {
    authService.clearAuth();
    router.navigate(['/login']);
    return throwError(() => new HttpErrorResponse({ status: 401 }));
  }

  // 没有进行中的刷新才发起新的刷新（并发去重）
  if (!refreshInProgress) {
    refreshInProgress = authService.refreshToken(refreshToken).pipe(
      tap((response: AuthResponse) => authService.storeAuthData(response)),
      shareReplay(1),
    );
    // 无论成功失败都清空进行中标记，避免后续请求误用已结束的流
    refreshInProgress.subscribe({
      next: () => {
        refreshInProgress = null;
      },
      error: () => {
        refreshInProgress = null;
      },
    });
  }

  // 所有并发请求共享同一次刷新结果（成功则带新 token 重放，失败则拿到错误并登出）
  return refreshInProgress.pipe(
    switchMap((response: AuthResponse) => {
      const newReq = req.clone({
        setHeaders: { Authorization: `Bearer ${response.token}` },
      });
      return next(newReq);
    }),
    catchError((err) => {
      authService.clearAuth();
      router.navigate(['/login']);
      return throwError(() => err);
    }),
  );
}
