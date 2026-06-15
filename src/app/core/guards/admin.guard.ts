import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, filter, take } from 'rxjs';

/**
 * 管理员守卫：必须先确保用户状态已恢复，再判断角色
 * - checking 状态时等待异步恢复完成
 * - 未登录跳登录页（带 redirect）
 * - 非管理员跳首页，不误跳登录页
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  const current = authService.authState();
  if (current === 'authenticated') {
    return authService.isAdmin()
      ? true
      : router.createUrlTree(['/']);
  }
  if (current === 'anonymous') {
    return router.createUrlTree(['/login'], {
      queryParams: { redirect: state.url }
    });
  }

  // checking 状态：等待恢复完成
  return authService.authState$.pipe(
    filter(s => s !== 'checking'),
    take(1),
    map(s => {
      if (s !== 'authenticated') {
        return router.createUrlTree(['/login'], {
          queryParams: { redirect: state.url }
        });
      }
      return authService.isAdmin()
        ? true
        : router.createUrlTree(['/']);
    })
  );
};
