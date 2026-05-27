import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  input,
  output,
  signal,
  HostListener,
  ViewChild,
} from '@angular/core';

@Component({
  selector: 'app-magnetic-button',
  template: `
    <button
      #btn
      class="mag-btn"
      [class.mag-btn--active]="isActive()"
      (click)="clicked.emit()"
      (mouseenter)="isActive.set(true)"
      (mouseleave)="isActive.set(false); resetTransform()"
      (mousemove)="onMouseMove($event)">
      <span class="mag-btn__glow"></span>
      <span class="mag-btn__text">
        <ng-content />
      </span>
    </button>
  `,
  styles: [`
    :host { display: inline-block; }
    .mag-btn {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 14px 36px;
      border: 1px solid var(--space-border, rgba(120, 220, 255, 0.22));
      border-radius: 6px;
      background: var(--space-panel, rgba(8, 14, 24, 0.58));
      color: var(--space-text, rgba(255,255,255,.88));
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      cursor: pointer;
      overflow: hidden;
      transition: border-color 300ms var(--ease-out), box-shadow 300ms var(--ease-out);
      will-change: transform;
    }
    .mag-btn:hover {
      border-color: var(--space-cyan, #00f5ff);
      box-shadow:
        0 0 20px rgba(0, 245, 255, 0.12),
        inset 0 0 20px rgba(0, 245, 255, 0.04);
    }
    .mag-btn__glow {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle 120px at var(--mx, 50%) var(--my, 50%), rgba(0, 245, 255, 0.12), transparent);
      opacity: 0;
      transition: opacity 300ms;
      pointer-events: none;
    }
    .mag-btn:hover .mag-btn__glow { opacity: 1; }
    .mag-btn__text { position: relative; z-index: 1; }
    .mag-btn:focus-visible {
      outline: 2px solid var(--space-cyan, #00f5ff);
      outline-offset: 3px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MagneticButtonComponent {
  @ViewChild('btn', { static: true }) btnRef!: ElementRef<HTMLButtonElement>;

  clicked = output<void>();
  strength = input<number>(0.35);
  isActive = signal(false);

  @HostListener('document:mouseleave')
  resetTransform(): void {
    const btn = this.btnRef?.nativeElement;
    if (btn) btn.style.transform = '';
  }

  onMouseMove(e: MouseEvent): void {
    const btn = this.btnRef.nativeElement;
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) * this.strength();
    const dy = (e.clientY - cy) * this.strength();
    btn.style.transform = `translate(${dx}px, ${dy}px)`;
    btn.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    btn.style.setProperty('--my', `${e.clientY - rect.top}px`);
  }
}
