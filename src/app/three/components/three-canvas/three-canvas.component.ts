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

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.sceneInstance = this.sceneFactory(canvas);
    this.sceneInstance.init();

    // 离开视口暂停渲染
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.sceneInstance?.resume?.();
          } else {
            this.sceneInstance?.pause?.();
          }
        });
      },
      { threshold: 0.1 }
    );
    this.observer.observe(this.canvasRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.sceneInstance?.destroy();
    this.sceneInstance = null;
  }
}
