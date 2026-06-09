import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authService = inject(AuthService);

  // 检查是否已登录
  if (!authService.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }

  // 检查是否是管理员
  if (!authService.isAdmin()) {
    return router.createUrlTree(['/']);
  }

  return true;
};
