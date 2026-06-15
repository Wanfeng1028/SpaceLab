import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, filter, take, switchMap } from 'rxjs';

/**
 * 认证守卫：仅允许已登录用户访问，未登录重定向到 /login
 * - 如果 authState 为 'checking'，等待认证完成再判断
 * - 跳登录时附带 redirect 参数
 */
export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  // 如果已经确定状态，直接判断
  const current = authService.authState();
  if (current === 'authenticated') {
    return true;
  }
  if (current === 'anonymous') {
    return router.createUrlTree(['/login'], {
      queryParams: { redirect: state.url }
    });
  }

  // checking 状态：等待 authState 变为非 checking
  return authService.authState$.pipe(
    filter(s => s !== 'checking'),
    take(1),
    map(s => {
      if (s === 'authenticated') {
        return true;
      }
      return router.createUrlTree(['/login'], {
        queryParams: { redirect: state.url }
      });
    })
  );
};
