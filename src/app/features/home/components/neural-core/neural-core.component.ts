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
import { HudFrameComponent } from '../../../../shared/components/hud/hud-frame.component';
import { HudMetricComponent } from '../../../../shared/components/hud/hud-metric.component';
import { TelemetryBarComponent } from '../../../../shared/components/hud/telemetry-bar.component';
import { NeuralCoreScene } from '../../../../three/scenes/neural-core.scene';
import { I18nService } from '../../../../core/services/i18n.service';

@Component({
  selector: 'app-neural-core',
  templateUrl: './neural-core.component.html',
  styleUrl: './neural-core.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThreeCanvasComponent, HudFrameComponent, HudMetricComponent, TelemetryBarComponent],
})
export class NeuralCoreSection implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly i18n = inject(I18nService);
  private scene: NeuralCoreScene | null = null;
  private telemetryTimer: ReturnType<typeof setTimeout> | null = null;

  readonly telemetryText = signal('NEURAL CORE // PROCESSING');

  readonly neuralFactory = (canvas: HTMLCanvasElement) => {
    this.scene = new NeuralCoreScene(canvas);
    return this.scene;
  };

  ngOnInit(): void {
    this.telemetryText.set(this.i18n.t('neuralCore.telemetryActive'));
  }

  t(key: string): string {
    return this.i18n.t(key);
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
    this.telemetryText.set(this.i18n.t('neuralCore.telemetryBurst'));
    if (this.telemetryTimer) {
      clearTimeout(this.telemetryTimer);
    }
    this.telemetryTimer = setTimeout(() => {
      this.telemetryText.set(this.i18n.t('neuralCore.telemetryActive'));
      this.telemetryTimer = null;
    }, 2000);
  }
}
