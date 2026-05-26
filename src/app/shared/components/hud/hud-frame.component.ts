import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CornerBracketsComponent } from './corner-brackets.component';

@Component({
  selector: 'hud-frame',
  imports: [CornerBracketsComponent],
  template: `
    <div class="hud-frame" [class.hud-frame--glow]="glow()">
      <hud-corner-brackets />
      <div class="hud-frame__content">
        <ng-content />
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .hud-frame {
      position: relative;
      background: var(--space-panel, rgba(8, 14, 24, 0.58));
      border: 1px solid var(--space-border, rgba(120, 220, 255, 0.22));
      border-radius: 6px;
      padding: 20px;
      backdrop-filter: blur(16px) saturate(120%);
      -webkit-backdrop-filter: blur(16px) saturate(120%);
      box-shadow:
        0 0 0 1px rgba(0, 245, 255, 0.04),
        inset 0 1px 0 rgba(255, 255, 255, 0.06),
        0 16px 48px rgba(0, 0, 0, 0.5);
    }
    .hud-frame--glow {
      box-shadow:
        0 0 0 1px rgba(0, 245, 255, 0.08),
        0 0 30px rgba(0, 245, 255, 0.06),
        inset 0 1px 0 rgba(255, 255, 255, 0.06),
        0 16px 48px rgba(0, 0, 0, 0.5);
    }
    .hud-frame__content {
      position: relative;
      z-index: 1;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HudFrameComponent {
  glow = input<boolean>(false);
}
