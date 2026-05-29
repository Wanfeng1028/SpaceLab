import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-vertical-section-title',
  template: `
    <div class="vtitle">
      <span class="vtitle__number">{{ number() }}</span>
      <span class="vtitle__text">{{ title() }}</span>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .vtitle {
        writing-mode: vertical-rl;
        text-orientation: mixed;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .vtitle__number {
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.15em;
        color: var(--space-cyan, #00f5ff);
        opacity: 0.7;
      }
      .vtitle__text {
        font-family: var(--font-sans);
        font-size: clamp(24px, 4vw, 42px);
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--space-text, rgba(255, 255, 255, 0.88));
        line-height: 1.1;
      }

      @media (max-width: 767px) {
        .vtitle {
          writing-mode: horizontal-tb;
          flex-direction: row;
          gap: 8px;
          align-items: baseline;
        }

        .vtitle__text {
          font-size: clamp(18px, 5vw, 28px);
        }

        .vtitle__number {
          font-size: 10px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerticalSectionTitleComponent {
  number = input.required<string>();
  title = input.required<string>();
  telemetryText = input<string>('');
}
