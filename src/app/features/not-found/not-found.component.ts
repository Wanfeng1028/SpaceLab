import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <div class="not-found">
      <h1>404</h1>
      <p>Page not found</p>
      <a routerLink="/" class="button-glass">Back to Home</a>
    </div>
  `,
  styles: [`
    .not-found {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 80vh;
      gap: var(--space-md);
      text-align: center;
    }
    h1 {
      font-size: 6rem;
      font-weight: 800;
      color: var(--color-text-secondary);
    }
    p {
      color: var(--color-text-tertiary);
      font-size: 1.25rem;
    }
  `],
})
export class NotFoundComponent {}
