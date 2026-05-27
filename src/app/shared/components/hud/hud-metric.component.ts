import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-hud-metric',
  template: `
    <div class="metric" [class.metric--animated]="animated()">
      <span class="metric__label">{{ label() }}</span>
      <span class="metric__dots"></span>
      <span class="metric__value" [style.color]="color()">{{ value() }}</span>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .metric {
      display: flex;
      align-items: baseline;
      gap: 8px;
      font-family: var(--font-mono);
      font-size: 12px;
      letter-spacing: 0.06em;
      line-height: 1.8;
      white-space: nowrap;
    }
    .metric__label {
      color: var(--space-muted, rgba(255,255,255,.48));
      text-transform: uppercase;
    }
    .metric__dots {
      flex: 1;
      border-bottom: 1px dotted rgba(255, 255, 255, 0.12);
      min-width: 12px;
      margin-bottom: 3px;
    }
    .metric__value {
      color: var(--space-cyan, #00f5ff);
      font-weight: 600;
    }
    .metric--animated .metric__value {
      animation: metric-pulse 2s ease-in-out infinite;
    }
    @keyframes metric-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
    @media (prefers-reduced-motion: reduce) {
      .metric--animated .metric__value { animation: none; opacity: 1; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HudMetricComponent {
  label = input.required<string>();
  value = input.required<string>();
  color = input<string>('var(--space-cyan)');
  animated = input<boolean>(false);
}
