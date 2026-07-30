import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  Input,
  ChangeDetectionStrategy,
} from '@angular/core';

type SceneFactory = (canvas: HTMLCanvasElement) => {
  init?(): void;
  destroy?(): void;
  pause?(): void;
  resume?(): void;
};

@Component({
  selector: 'app-three-canvas',
  template: `<canvas #canvas class="three-canvas"></canvas>`,
  styles: [
    `
      :host {
        position: absolute;
        inset: 0;
        z-index: 0;
        pointer-events: auto;
      }
      .three-canvas {
        display: block;
        width: 100%;
        height: 100%;
        touch-action: none;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThreeCanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input({ required: true }) sceneFactory!: SceneFactory;

  private sceneInstance: ReturnType<SceneFactory> | null = null;
  private observer: IntersectionObserver | null = null;
  private initialized = false;
  private destroyTimer: any = null;
  private readonly DESTROY_DELAY = 5000;

  ngAfterViewInit(): void {
    // 延迟初始化：仅当进入视口时才创建 Three.js 场景
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // 回到视口：取消延迟销毁定时器
            if (this.destroyTimer !== null) {
              clearTimeout(this.destroyTimer);
              this.destroyTimer = null;
            }
            if (!this.initialized) {
              // 尚未初始化（首次或已被 destroy）→ 重新创建场景
              this.initializeScene();
            } else {
              this.sceneInstance?.resume?.();
            }
          } else {
            // 离开视口：先暂停，5秒后销毁释放显存
            this.sceneInstance?.pause?.();
            if (this.destroyTimer === null && this.initialized) {
              this.destroyTimer = setTimeout(() => {
                this.sceneInstance?.destroy?.();
                this.sceneInstance = null;
                this.initialized = false;
                this.destroyTimer = null;
              }, this.DESTROY_DELAY);
            }
          }
        });
      },
      { threshold: 0.01, rootMargin: '0px 0px 100px 0px' },
    );
    this.observer.observe(this.canvasRef.nativeElement);
  }

  private initializeScene(): void {
    const canvas = this.canvasRef.nativeElement;
    this.sceneInstance = this.sceneFactory(canvas);
    this.sceneInstance?.init?.();
    this.initialized = true;
  }

  ngOnDestroy(): void {
    if (this.destroyTimer !== null) {
      clearTimeout(this.destroyTimer);
      this.destroyTimer = null;
    }
    this.observer?.disconnect();
    this.sceneInstance?.destroy?.();
    this.sceneInstance = null;
    this.initialized = false;
  }
}
