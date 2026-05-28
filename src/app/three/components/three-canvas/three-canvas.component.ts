import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  Input,
  ChangeDetectionStrategy,
} from '@angular/core';

type SceneFactory = (canvas: HTMLCanvasElement) => { init(): void; destroy(): void; pause?(): void; resume?(): void };

@Component({
  selector: 'app-three-canvas',
  template: `<canvas #canvas class="three-canvas"></canvas>`,
  styles: [`
    :host {
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
    }
    .three-canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThreeCanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input({ required: true }) sceneFactory!: SceneFactory;

  private sceneInstance: { init(): void; destroy(): void; pause?(): void; resume?(): void } | null = null;
  private observer: IntersectionObserver | null = null;
  private initialized = false;

  ngAfterViewInit(): void {
    console.log('[ThreeCanvas] ngAfterViewInit called', {
      canvasRef: !!this.canvasRef,
      canvasElement: this.canvasRef?.nativeElement,
      sceneFactory: !!this.sceneFactory
    });

    // 延迟初始化：仅当进入视口时才创建 Three.js 场景
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          console.log('[ThreeCanvas] IntersectionObserver entry', {
            isIntersecting: entry.isIntersecting,
            intersectionRatio: entry.intersectionRatio,
            target: entry.target.tagName
          });
          if (entry.isIntersecting) {
            if (!this.initialized) {
              this.initializeScene();
            } else {
              this.sceneInstance?.resume?.();
            }
          } else {
            this.sceneInstance?.pause?.();
          }
        });
      },
      { threshold: 0.01, rootMargin: '0px 0px 100px 0px' }
    );
    this.observer.observe(this.canvasRef.nativeElement);

    // 立即检查可见性
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    console.log('[ThreeCanvas] Initial visibility check', {
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      isInViewport: rect.top < window.innerHeight && rect.bottom > 0 && rect.left < window.innerWidth && rect.right > 0
    });
  }

  private initializeScene(): void {
    console.log('[ThreeCanvas] initializeScene called');
    const canvas = this.canvasRef.nativeElement;
    console.log('[ThreeCanvas] Canvas element', {
      width: canvas.width,
      height: canvas.height,
      style: {
        width: canvas.style.width,
        height: canvas.style.height
      }
    });
    this.sceneInstance = this.sceneFactory(canvas);
    this.sceneInstance.init();
    this.initialized = true;
    console.log('[ThreeCanvas] Scene initialized');
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.sceneInstance?.destroy();
    this.sceneInstance = null;
    this.initialized = false;
  }
}
