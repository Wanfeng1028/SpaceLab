import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-project-card',
  template: `
    <a class="card-project glass-card-hover" [routerLink]="['/projects', slug]">
      <div class="card-project__icon" [style.background]="accentColor + '22'">
        <span [style.color]="accentColor">{{ icon }}</span>
      </div>
      <div class="card-project__body">
        <h3 class="card-project__title">{{ title }}</h3>
        <p class="card-project__desc">{{ description }}</p>
        <div class="card-project__stack">
          @for (tech of stack; track tech) {
            <span class="stack-tag">{{ tech }}</span>
          }
        </div>
      </div>
    </a>
  `,
  styles: [
    `
      .card-project {
        display: flex;
        align-items: flex-start;
        gap: var(--space-lg);
        padding: var(--space-xl);
        border-radius: var(--radius-2xl);
        text-decoration: none;
        color: inherit;
        transition:
          transform 0.4s var(--ease-out),
          box-shadow 0.4s var(--ease-out);

        &:hover {
          transform: translateY(-4px);
        }
      }

      .card-project__icon {
        flex-shrink: 0;
        width: 48px;
        height: 48px;
        border-radius: var(--radius-lg);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
      }

      .card-project__body {
        display: flex;
        flex-direction: column;
        gap: var(--space-xs);
        min-width: 0;
      }

      .card-project__title {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--color-text);
      }

      .card-project__desc {
        font-size: 0.875rem;
        color: var(--color-text-secondary);
        line-height: 1.5;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .card-project__stack {
        display: flex;
        gap: var(--space-xs);
        flex-wrap: wrap;
        margin-top: var(--space-xs);
      }

      .stack-tag {
        font-size: 0.7rem;
        color: var(--color-text-tertiary);
        background: rgba(0, 0, 0, 0.04);
        padding: 2px 6px;
        border-radius: var(--radius-full);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
})
export class ProjectCardComponent {
  @Input({ required: true }) title = '';
  @Input({ required: true }) slug = '';
  @Input({ required: true }) icon = '';
  @Input() description = '';
  @Input() accentColor = '#1a73e8';
  @Input() stack: string[] = [];
}
