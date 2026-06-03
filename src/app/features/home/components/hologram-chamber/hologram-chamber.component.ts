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
import { TelemetryBarComponent } from '../../../../shared/components/hud/telemetry-bar.component';
import { HologramChamberScene } from '../../../../three/scenes/hologram-chamber.scene';
import { I18nService } from '../../../../core/services/i18n.service';

@Component({
  selector: 'app-hologram-chamber',
  templateUrl: './hologram-chamber.component.html',
  styleUrl: './hologram-chamber.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThreeCanvasComponent, TelemetryBarComponent],
})
export class HologramChamberSection implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly i18n = inject(I18nService);

  private scene: HologramChamberScene | null = null;

  readonly telemetryText = signal('');

  readonly hologramFactory = (canvas: HTMLCanvasElement) => {
    this.scene = new HologramChamberScene(canvas);
    return this.scene;
  };

  t(key: string): string {
    return this.i18n.t(key);
  }

  ngOnInit(): void {
    this.telemetryText.set(this.i18n.t('hologramChamber.telemetryActive'));
  }

  ngOnDestroy(): void {
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
}
