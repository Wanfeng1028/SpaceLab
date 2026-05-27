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
import { OrbitalLearningScene } from '../../../../three/scenes/orbital-learning.scene';

@Component({
  selector: 'app-orbital-learning',
  templateUrl: './orbital-learning.component.html',
  styleUrl: './orbital-learning.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ThreeCanvasComponent,
    VerticalSectionTitleComponent,
    TelemetryBarComponent,
  ],
})
export class OrbitalLearningSection implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private scene: OrbitalLearningScene | null = null;

  readonly telemetryText = signal('ORBITAL LEARNING // MAPPING');

  readonly orbitalFactory = (canvas: HTMLCanvasElement) => {
    this.scene = new OrbitalLearningScene(canvas);
    return this.scene;
  };

  readonly stemLabels = ['SCIENCE', 'TECHNOLOGY', 'ENGINEERING', 'MATHEMATICS'];

  ngOnInit(): void {
    this.telemetryText.set('ORBITAL LEARNING // ACTIVE');
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
