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

@Component({
  selector: 'app-hologram-chamber',
  templateUrl: './hologram-chamber.component.html',
  styleUrl: './hologram-chamber.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThreeCanvasComponent, TelemetryBarComponent],
})
export class HologramChamberSection implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);

  private scene: HologramChamberScene | null = null;

  readonly telemetryText = signal('HOLOGRAM CHAMBER // HOVER TO INTERACT');

  readonly hologramFactory = (canvas: HTMLCanvasElement) => {
    this.scene = new HologramChamberScene(canvas);
    return this.scene;
  };

  ngOnInit(): void {
    this.telemetryText.set('HOLOGRAM CHAMBER // VOLUMETRIC DISPLAY ACTIVE');
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
}
