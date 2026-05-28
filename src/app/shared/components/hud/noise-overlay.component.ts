import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'hud-noise-overlay',
  template: `
    <svg class="noise-svg" aria-hidden="true">
      <filter id="hud-noise-filter">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.65"
          numOctaves="3"
          stitchTiles="stitch"
        />
      </filter>
      <rect width="100%" height="100%" filter="url(#hud-noise-filter)" />
    </svg>
  `,
  styles: [
    `
      :host {
        position: fixed;
        inset: 0;
        z-index: 9997;
        pointer-events: none;
        opacity: 0.035;
        mix-blend-mode: overlay;
      }
      .noise-svg {
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoiseOverlayComponent {}
