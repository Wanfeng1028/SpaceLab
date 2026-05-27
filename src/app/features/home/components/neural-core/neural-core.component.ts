import {
  Component,
  ChangeDetectionStrategy,
  signal,
  HostListener,
  OnInit,
  OnDestroy,
  ElementRef,
  inject,
} from '@angular/core';
import { ThreeCanvasComponent } from '../../../../three/components/three-canvas/three-canvas.component';
import { VerticalSectionTitleComponent } from '../../../../shared/components/hud/vertical-section-title.component';
import { HudFrameComponent } from '../../../../shared/components/hud/hud-frame.component';
import { HudMetricComponent } from '../../../../shared/components/hud/hud-metric.component';
import { TelemetryBarComponent } from '../../../../shared/components/hud/telemetry-bar.component';
import { NeuralCoreScene } from '../../../../three/scenes/neural-core.scene';

@Component({
  selector: 'app-neural-core',
  templateUrl: './neural-core.component.html',
  styleUrl: './neural-core.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ThreeCanvasComponent,
    VerticalSectionTitleComponent,
    HudFrameComponent,
    HudMetricComponent,
    TelemetryBarComponent,
  ],
})
export class NeuralCoreSection implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private scene: NeuralCoreScene | null = null;
  private telemetryTimer: ReturnType<typeof setTimeout> | null = null;

  readonly telemetryText = signal('NEURAL CORE // PROCESSING');

  readonly neuralFactory = (canvas: HTMLCanvasElement) => {
    this.scene = new NeuralCoreScene(canvas);
    return this.scene;
  };

  ngOnInit(): void {
    this.telemetryText.set('NEURAL CORE // ACTIVE');
  }

  ngOnDestroy(): void {
    if (this.telemetryTimer) {
      clearTimeout(this.telemetryTimer);
      this.telemetryTimer = null;
    }
    this.scene?.destroy();
    this.scene = null;
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.scene) return;
    const rect = this.el.nativeElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.scene.updateMouse(x, y);
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    if (!this.scene) return;
    this.scene.triggerTokenBurst();
    this.telemetryText.set('NEURAL CORE // TOKEN BURST');
    if (this.telemetryTimer) {
      clearTimeout(this.telemetryTimer);
    }
    this.telemetryTimer = setTimeout(() => {
      this.telemetryText.set('NEURAL CORE // ACTIVE');
      this.telemetryTimer = null;
    }, 2000);
  }
}
