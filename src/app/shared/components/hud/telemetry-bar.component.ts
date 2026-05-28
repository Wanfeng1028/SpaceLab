import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-telemetry-bar',
  template: `
    <div class="telemetry-bar" [class.telemetry-bar--online]="status() === 'online'">
      <span class="telemetry-bar__dot"></span>
      <span class="telemetry-bar__text">{{ text() }}</span>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .telemetry-bar {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 20px;
        background: rgba(8, 14, 24, 0.65);
        border-top: 1px solid var(--space-border, rgba(120, 220, 255, 0.22));
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.08em;
        color: var(--space-muted, rgba(255, 255, 255, 0.48));
      }
      .telemetry-bar__dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--space-cyan, #00f5ff);
        box-shadow: 0 0 8px var(--space-cyan, #00f5ff);
        animation: telemetry-blink 2s ease-in-out infinite;
      }
      .telemetry-bar--online .telemetry-bar__dot {
        background: #00ff88;
        box-shadow: 0 0 8px #00ff88;
      }
      @keyframes telemetry-blink {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.3;
        }
      }
      .telemetry-bar__text {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      @media (prefers-reduced-motion: reduce) {
        .telemetry-bar__dot {
          animation: none;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TelemetryBarComponent {
  text = input.required<string>();
  status = input<'online' | 'offline' | 'warning'>('offline');
}
