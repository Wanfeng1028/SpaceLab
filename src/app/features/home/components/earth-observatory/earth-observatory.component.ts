import {
  Component,
  ChangeDetectionStrategy,
  signal,
  OnInit,
  OnDestroy,
  HostListener,
  ElementRef,
  inject,
} from '@angular/core';
import { ThreeCanvasComponent } from '../../../../three/components/three-canvas/three-canvas.component';
import { HudFrameComponent } from '../../../../shared/components/hud/hud-frame.component';
import { HudMetricComponent } from '../../../../shared/components/hud/hud-metric.component';
import { TelemetryBarComponent } from '../../../../shared/components/hud/telemetry-bar.component';
import { EarthObservatoryLightScene } from '../../../../three/scenes/earth-observatory-light.scene';

interface ScaleTick {
  value: number;
  major: boolean;
}

@Component({
  selector: 'app-earth-observatory',
  templateUrl: './earth-observatory.component.html',
  styleUrl: './earth-observatory.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThreeCanvasComponent, HudFrameComponent, HudMetricComponent, TelemetryBarComponent],
})
export class EarthObservatorySection implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private scene: EarthObservatoryLightScene | null = null;
  private telemetryTimer: ReturnType<typeof setTimeout> | null = null;

  readonly telemetryText = signal('EARTH OBSERVATORY // SCANNING');

  readonly scaleTicks: ScaleTick[] = Array.from({ length: 24 }, (_, i) => ({
    value: i * 15,
    major: i % 4 === 0,
  }));

  readonly earthFactory = (canvas: HTMLCanvasElement) => {
    this.scene = new EarthObservatoryLightScene(canvas);
    return this.scene;
  };

  ngOnInit(): void {
    this.telemetryText.set('EARTH OBSERVATORY // ACTIVE');
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
    this.scene.triggerScanWave();
    this.telemetryText.set('EARTH OBSERVATORY // AREA LOCKED');
    if (this.telemetryTimer) {
      clearTimeout(this.telemetryTimer);
    }
    this.telemetryTimer = setTimeout(() => {
      this.telemetryText.set('EARTH OBSERVATORY // SCANNING');
      this.telemetryTimer = null;
    }, 2000);
  }
}
