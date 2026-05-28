import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-pulse-metric',
  template: `
    <div class="pulse-metric">
      <span class="pulse-metric__value">{{ value }}</span>
      <span class="pulse-metric__label">{{ label }}</span>
    </div>
  `,
  styles: [
    `
      .pulse-metric {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-xs);
        padding: var(--space-lg) var(--space-xl);
      }

      .pulse-metric__value {
        font-family: var(--font-display);
        font-size: clamp(1.75rem, 3vw, 2.5rem);
        font-weight: 700;
        color: var(--color-text);
        line-height: 1;
      }

      .pulse-metric__label {
        font-size: 0.8rem;
        color: var(--color-text-tertiary);
        text-align: center;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PulseMetricComponent {
  @Input({ required: true }) value = '';
  @Input({ required: true }) label = '';
}
