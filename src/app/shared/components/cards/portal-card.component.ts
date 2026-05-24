import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-portal-card',
  template: `
    <a class="portal-card glass-card-hover" [routerLink]="route">
      <span class="portal-card__icon">{{ icon }}</span>
      <h3 class="portal-card__title">{{ title }}</h3>
      <p class="portal-card__desc">{{ description }}</p>
    </a>
  `,
  styles: [`
    .portal-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: var(--space-xl) var(--space-lg);
      border-radius: var(--radius-2xl);
      text-decoration: none;
      color: inherit;
      transition: transform 0.4s var(--ease-out), box-shadow 0.4s var(--ease-out);
      min-width: 180px;

      &:hover {
        transform: translateY(-6px);
      }
    }

    .portal-card__icon {
      font-size: 2rem;
      margin-bottom: var(--space-sm);
    }

    .portal-card__title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: var(--space-xs);
    }

    .portal-card__desc {
      font-size: 0.8rem;
      color: var(--color-text-tertiary);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
})
export class PortalCardComponent {
  @Input({ required: true }) icon = '';
  @Input({ required: true }) title = '';
  @Input({ required: true }) route: string | string[] = '/';
  @Input() description = '';
}
