import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'hud-scanline-overlay',
  template: `<div class="scanline-overlay"></div>`,
  styles: [`
    :host {
      position: fixed;
      inset: 0;
      z-index: 9998;
      pointer-events: none;
      overflow: hidden;
    }
    .scanline-overlay {
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(0, 0, 0, 0.03) 2px,
        rgba(0, 0, 0, 0.03) 4px
      );
      animation: scanline-drift 8s linear infinite;
    }
    @keyframes scanline-drift {
      0% { transform: translateY(0); }
      100% { transform: translateY(4px); }
    }
    @media (prefers-reduced-motion: reduce) {
      .scanline-overlay { animation: none; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScanlineOverlayComponent {}
