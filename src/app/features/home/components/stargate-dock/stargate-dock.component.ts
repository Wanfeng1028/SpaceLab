import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '../../../../core/services/i18n.service';
import { ThreeCanvasComponent } from '../../../../three/components/three-canvas/three-canvas.component';
import { MagneticButtonComponent } from '../../../../shared/components/hud/magnetic-button.component';
import { TelemetryBarComponent } from '../../../../shared/components/hud/telemetry-bar.component';
import { StargateScene } from '../../../../three/scenes/stargate.scene';

@Component({
  selector: 'app-portal-gallery',
  templateUrl: './stargate-dock.component.html',
  styleUrl: './stargate-dock.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThreeCanvasComponent, MagneticButtonComponent, TelemetryBarComponent],
})
export class PortalGallerySection implements OnInit {
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);

  readonly telemetryText = signal('AI FRONTLINE // DAILY SIGNALS AWAITING');

  readonly stargateFactory = (canvas: HTMLCanvasElement) =>
    new StargateScene(canvas);

  readonly currentYear = new Date().getFullYear();

  ngOnInit(): void {
    this.telemetryText.set('AI FRONTLINE // SIGNALS ONLINE');
  }

  t(key: string): string {
    return this.i18n.t(key);
  }

  onEnter(): void {
    this.router.navigate(['/ai-frontline']);
  }

  onReturnTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onExplore(): void {
    this.router.navigate(['/projects']);
  }
}
