import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'hud-corner-brackets',
  template: `
    <div class="bracket tl"></div>
    <div class="bracket tr"></div>
    <div class="bracket bl"></div>
    <div class="bracket br"></div>
  `,
  styles: [
    `
      :host {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 2;
      }
      .bracket {
        position: absolute;
        width: 18px;
        height: 18px;
      }
      .bracket::before,
      .bracket::after {
        content: '';
        position: absolute;
        background: var(--space-border, rgba(120, 220, 255, 0.22));
      }
      .tl {
        top: 0;
        left: 0;
      }
      .tl::before {
        top: 0;
        left: 0;
        width: 18px;
        height: 1px;
      }
      .tl::after {
        top: 0;
        left: 0;
        width: 1px;
        height: 18px;
      }
      .tr {
        top: 0;
        right: 0;
      }
      .tr::before {
        top: 0;
        right: 0;
        width: 18px;
        height: 1px;
      }
      .tr::after {
        top: 0;
        right: 0;
        width: 1px;
        height: 18px;
      }
      .bl {
        bottom: 0;
        left: 0;
      }
      .bl::before {
        bottom: 0;
        left: 0;
        width: 18px;
        height: 1px;
      }
      .bl::after {
        bottom: 0;
        left: 0;
        width: 1px;
        height: 18px;
      }
      .br {
        bottom: 0;
        right: 0;
      }
      .br::before {
        bottom: 0;
        right: 0;
        width: 18px;
        height: 1px;
      }
      .br::after {
        bottom: 0;
        right: 0;
        width: 1px;
        height: 18px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CornerBracketsComponent {}
