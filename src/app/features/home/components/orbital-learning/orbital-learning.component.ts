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
import { OrbitalLearningLightScene } from '../../../../three/scenes/orbital-learning-light.scene';

@Component({
  selector: 'app-orbital-learning',
  templateUrl: './orbital-learning.component.html',
  styleUrl: './orbital-learning.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThreeCanvasComponent, TelemetryBarComponent],
})
export class OrbitalLearningSection implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private scene: OrbitalLearningLightScene | null = null;

  readonly telemetryText = signal('KNOWLEDGE ORBIT // MAPPING');

  readonly orbitalFactory = (canvas: HTMLCanvasElement) => {
    this.scene = new OrbitalLearningLightScene(canvas);
    return this.scene;
  };

  readonly stemLabels = ['SCIENCE', 'TECHNOLOGY', 'ENGINEERING', 'MATHEMATICS'];

  ngOnInit(): void {
    this.telemetryText.set('KNOWLEDGE ORBIT // ACTIVE');
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
