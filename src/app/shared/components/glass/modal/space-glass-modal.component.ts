import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  HostListener,
  ElementRef,
  inject,
  effect,
  OnDestroy,
  AfterViewInit,
} from '@angular/core';

@Component({
  selector: 'space-glass-modal',
  templateUrl: './space-glass-modal.html',
  styleUrl: './space-glass-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpaceGlassModalComponent implements AfterViewInit, OnDestroy {
  private elRef = inject(ElementRef);

  /** 弹窗尺寸变体 */
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  /** 是否显示关闭按钮 */
  readonly showClose = input(true);

  /** 是否点击遮罩关闭 */
  readonly closeOnOverlay = input(true);

  /** 遮罩层光斑颜色 — 默认暖黄+冷蓝 */
  readonly orbColor1 = input('rgba(255, 210, 31, 0.14)');
  readonly orbColor2 = input('rgba(120, 170, 255, 0.12)');

  /** 关闭事件 */
  readonly closed = output<void>();

  private previousActiveElement: HTMLElement | null = null;

  ngAfterViewInit(): void {
    this.previousActiveElement = document.activeElement as HTMLElement;
    this.trapFocus();
  }

  ngOnDestroy(): void {
    this.previousActiveElement?.focus();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closed.emit();
  }

  @HostListener('document:keydown', ['$event'])
  onTabKey(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;

    const panel = this.elRef.nativeElement.querySelector('.sgm-panel') as HTMLElement;
    if (!panel) return;

    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  onOverlayClick(e: MouseEvent): void {
    if (this.closeOnOverlay() && (e.target as HTMLElement).classList.contains('sgm-overlay')) {
      this.closed.emit();
    }
  }

  onClose(): void {
    this.closed.emit();
  }

  private trapFocus(): void {
    const panel = this.elRef.nativeElement.querySelector('.sgm-panel') as HTMLElement;
    if (!panel) return;
    const firstFocusable = panel.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();
  }
}
