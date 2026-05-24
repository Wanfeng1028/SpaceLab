import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  HostListener,
  ElementRef,
  inject,
  effect,
} from '@angular/core';

@Component({
  selector: 'space-glass-modal',
  templateUrl: './space-glass-modal.html',
  styleUrl: './space-glass-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpaceGlassModalComponent {
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

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closed.emit();
  }

  onOverlayClick(e: MouseEvent): void {
    if (this.closeOnOverlay() && (e.target as HTMLElement).classList.contains('sgm-overlay')) {
      this.closed.emit();
    }
  }

  onClose(): void {
    this.closed.emit();
  }
}
