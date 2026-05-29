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
import { TelemetryBarComponent } from '../../../../shared/components/hud/telemetry-bar.component';
import { ParticleOceanScene } from '../../../../three/scenes/particle-ocean.scene';
import { I18nService } from '../../../../core/services/i18n.service';

@Component({
  selector: 'app-particle-ocean',
  templateUrl: './particle-ocean.component.html',
  styleUrl: './particle-ocean.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThreeCanvasComponent, VerticalSectionTitleComponent, TelemetryBarComponent],
})
export class ParticleOceanSection implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly i18n = inject(I18nService);

  private scene: ParticleOceanScene | null = null;
  private resizeHandler: (() => void) | null = null;

  readonly telemetryText = signal('');

  readonly particleFactory = (canvas: HTMLCanvasElement) => {
    this.scene = new ParticleOceanScene(canvas);
    return this.scene;
  };

  t(key: string): string {
    return this.i18n.t(key);
  }

  ngOnInit(): void {
    this.telemetryText.set(this.i18n.t('particleOcean.telemetryActive'));
  }

  ngOnDestroy(): void {
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
    const rect = this.el.nativeElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.scene.triggerRipple(x, y);
  }
}
