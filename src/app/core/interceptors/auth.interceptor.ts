import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { tap } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  // 如果有 token，添加到请求头
  if (token) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(authReq).pipe(
      tap({
        error: (err) => {
          // Token 无效或过期时，清理并跳转登录页
          if (err.status === 401) {
            authService.isLoggedInSig.set(false);
            authService.currentUserSig.set(null);
            localStorage.removeItem('token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            router.navigate(['/login']);
          }
        }
      })
    );
  }

  return next(req);
};
