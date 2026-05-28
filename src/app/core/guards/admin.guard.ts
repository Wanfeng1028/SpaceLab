import { isDevMode, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

// TODO: Replace localStorage check with Supabase JWT + RLS once backend is integrated.
// Current guard is UX-only — any user can bypass via localStorage.setItem('isAdmin','true').
export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);

  if (typeof localStorage !== 'undefined' && localStorage.getItem('isAdmin') === 'true') {
    if (isDevMode()) {
      console.warn('[adminGuard] Using localStorage-based auth — NOT a security boundary. Integrate Supabase JWT + RLS before production.');
    }
    return true;
  }

  return router.createUrlTree(['/']);
};
