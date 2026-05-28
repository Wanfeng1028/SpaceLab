import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

// TODO: Implement proper authentication (Supabase JWT + RLS) before production.
// This guard currently blocks all access until auth is implemented.
export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);

  // Remove localStorage check — not a security boundary.
  // Temporary: always redirect to home until authentication is integrated.
  // To enable admin access temporarily during development, uncomment the line below.
  // if (typeof localStorage !== 'undefined' && localStorage.getItem('isAdmin') === 'true') {
  //   return true;
  // }

  return router.createUrlTree(['/']);
};
