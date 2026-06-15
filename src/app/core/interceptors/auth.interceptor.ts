import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, AuthResponse } from '../services/auth.service';
import { catchError, switchMap, throwError, of, BehaviorSubject, filter, take, Observable } from 'rxjs';

/** 是否正在刷新 token */
let isRefreshing = false;
/** 刷新 token 后的重放队列 */
let refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getRawToken();

  // 如果有 token，添加到请求头
  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // 只对需要认证的请求处理 401
      if (error.status === 401 && token) {
        // 排除 login/register/refresh 请求
        const isAuthEndpoint = req.url.includes('/auth/login') ||
          req.url.includes('/auth/register') ||
          req.url.includes('/auth/refresh');

        if (!isAuthEndpoint) {
          return handleTokenExpired(authService, router, req, next);
        }
      }

      return throwError(() => error);
    })
  );
};

/** 处理 token 过期：尝试 refresh，成功则重放原请求 */
function handleTokenExpired(
  authService: AuthService,
  router: Router,
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    const refreshToken = typeof localStorage !== 'undefined' ? localStorage.getItem('refresh_token') : null;

    if (!refreshToken) {
      isRefreshing = false;
      authService.clearAuth();
      router.navigate(['/login']);
      return throwError(() => new HttpErrorResponse({ status: 401 }));
    }

    // 使用 AuthService 公开的 refreshToken 方法
    return authService.refreshToken(refreshToken).pipe(
      switchMap((response: AuthResponse) => {
        isRefreshing = false;
        refreshTokenSubject.next(response.token);

        // 通过公开方法存储新 token
        authService.storeAuthData(response);

        // 用新 token 重放原请求
        const newReq = req.clone({
          setHeaders: { Authorization: `Bearer ${response.token}` }
        });
        return next(newReq);
      }),
      catchError((err) => {
        isRefreshing = false;
        authService.clearAuth();
        router.navigate(['/login']);
        return throwError(() => err);
      })
    );
  }

  // 正在刷新中，等待刷新完成再重放
  return refreshTokenSubject.pipe(
    filter(token => token !== null),
    take(1),
    switchMap((newToken) => {
      const newReq = req.clone({
        setHeaders: { Authorization: `Bearer ${newToken}` }
      });
      return next(newReq);
    })
  );
}
