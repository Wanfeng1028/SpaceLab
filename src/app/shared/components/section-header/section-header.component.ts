import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-section-header',
  template: `
    <div class="section-header">
      <div class="section-header__text">
        <h2 class="section-header__title">{{ title }}</h2>
        @if (subtitle) {
          <p class="section-header__subtitle">{{ subtitle }}</p>
        }
      </div>
      @if (linkRoute && linkText) {
        <a class="section-header__link" [routerLink]="linkRoute"> {{ linkText }} → </a>
      }
    </div>
  `,
  styles: [
    `
      .section-header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: var(--space-lg);
        margin-bottom: var(--space-2xl);
      }

      .section-header__title {
        font-size: clamp(1.5rem, 3vw, 2rem);
        font-weight: 700;
        color: var(--color-text);
        letter-spacing: -0.02em;
      }

      .section-header__subtitle {
        font-size: 0.9rem;
        color: var(--color-text-secondary);
        margin-top: var(--space-xs);
      }

      .section-header__link {
        font-size: 0.875rem;
        color: var(--color-text-secondary);
        text-decoration: none;
        white-space: nowrap;
        transition: color 0.2s;

        &:hover {
          color: var(--color-text);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
})
export class SectionHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
  @Input() linkRoute: string | null = null;
  @Input() linkText: string | null = null;
}
