import { Component, ChangeDetectionStrategy, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { ThreeCanvasComponent } from '../../../../three/components/three-canvas/three-canvas.component';
import { HudFrameComponent } from '../../../../shared/components/hud/hud-frame.component';
import { HudMetricComponent } from '../../../../shared/components/hud/hud-metric.component';
import { TelemetryBarComponent } from '../../../../shared/components/hud/telemetry-bar.component';
import { EclipseCoreScene } from '../../../../three/scenes/eclipse-core.scene';
import { I18nService } from '../../../../core/services/i18n.service';

interface ScaleTick {
  value: number;
  major: boolean;
}

@Component({
  selector: 'app-eclipse-observatory',
  templateUrl: './eclipse-observatory.component.html',
  styleUrl: './eclipse-observatory.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThreeCanvasComponent, HudFrameComponent, HudMetricComponent, TelemetryBarComponent],
})
export class EclipseObservatorySection implements OnInit, OnDestroy {
  private readonly i18n = inject(I18nService);

  readonly telemetryText = signal('');

  readonly scaleTicks: ScaleTick[] = Array.from({ length: 24 }, (_, i) => ({
    value: i * 15,
    major: i % 4 === 0,
  }));

  private pulseTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly eclipseFactory = (canvas: HTMLCanvasElement) => new EclipseCoreScene(canvas);

  t(key: string): string {
    return this.i18n.t(key);
  }

  ngOnInit(): void {
    this.telemetryText.set(this.i18n.t('eclipseObservatory.telemetryCalibrating'));
  }

  ngOnDestroy(): void {
    if (this.pulseTimeout !== null) {
      clearTimeout(this.pulseTimeout);
    }
  }

  triggerPulse(): void {
    this.telemetryText.set('ECLIPSE OBSERVATORY // CORONA PULSE DETECTED');
    if (this.pulseTimeout !== null) {
      clearTimeout(this.pulseTimeout);
    }
    this.pulseTimeout = setTimeout(() => {
      this.telemetryText.set('ECLIPSE OBSERVATORY // STANDBY');
    }, 3000);
  }
}
