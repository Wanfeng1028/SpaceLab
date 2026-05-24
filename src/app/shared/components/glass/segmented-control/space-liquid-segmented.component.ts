import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  effect,
  ElementRef,
  inject,
  AfterViewInit,
  OnDestroy,
  ViewChildren,
  QueryList,
} from '@angular/core';

@Component({
  selector: 'space-liquid-segmented',
  templateUrl: './space-liquid-segmented.html',
  styleUrl: './space-liquid-segmented.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpaceLiquidSegmentedControlComponent implements AfterViewInit, OnDestroy {
  private elRef = inject(ElementRef);

  /** 选项列表 */
  readonly options = input.required<string[]>();

  /** 当前选中索引 */
  readonly selectedIndex = input(0);

  /** 颜色变体 */
  readonly tint = input<'default' | 'blue' | 'yellow' | 'violet' | 'cyan'>('default');

  /** 选择变化事件 */
  readonly selectionChange = output<number>();

  /** 滑块位置状态 */
  readonly sliderLeft = signal(0);
  readonly sliderWidth = signal(0);

  private resizeObserver: ResizeObserver | null = null;

  ngAfterViewInit(): void {
    this.updateSlider();
    this.resizeObserver = new ResizeObserver(() => this.updateSlider());
    this.resizeObserver.observe(this.elRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  onSelect(index: number): void {
    if (index !== this.selectedIndex()) {
      this.selectionChange.emit(index);
      // 延迟一帧让 DOM 更新后再更新滑块
      requestAnimationFrame(() => this.updateSlider());
    }
  }

  updateSlider(): void {
    const host = this.elRef.nativeElement as HTMLElement;
    const track = host.querySelector('.sls-track');
    const buttons = host.querySelectorAll('.sls-option');

    if (!track || !buttons.length) return;

    const activeBtn = buttons[this.selectedIndex()] as HTMLElement;
    if (!activeBtn) return;

    const trackRect = track.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();

    this.sliderLeft.set(btnRect.left - trackRect.left);
    this.sliderWidth.set(btnRect.width);
  }
}
