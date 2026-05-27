import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

// NOTE: 此 guard 仅用于前端路由 UX 层控制，不构成安全边界。
// 任何用户可通过 localStorage.setItem('isAdmin','true') 绕过。
// 接入 Supabase 后端后，真正的写操作权限必须由后端 Row Level Security + JWT 强制校验。
export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);

  if (typeof localStorage !== 'undefined' && localStorage.getItem('isAdmin') === 'true') {
    return true;
  }

  return router.createUrlTree(['/']);
};
