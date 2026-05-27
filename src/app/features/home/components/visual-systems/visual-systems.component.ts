import {
  Component,
  ChangeDetectionStrategy,
  signal,
  HostListener,
  HostBinding,
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
import { VisualSystemsScene } from '../../../../three/scenes/visual-systems.scene';

@Component({
  selector: 'app-visual-systems',
  templateUrl: './visual-systems.component.html',
  styleUrl: './visual-systems.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ThreeCanvasComponent,
    VerticalSectionTitleComponent,
    HudFrameComponent,
    HudMetricComponent,
    TelemetryBarComponent,
  ],
  host: {
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerUp()',
    '(pointerleave)': 'onPointerUp()',
  },
})
export class VisualSystemsSection implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private scene: VisualSystemsScene | null = null;
  private isDragging = false;
  private dragStartX = 0;

  readonly telemetryText = signal('VISUAL SYSTEMS // RENDERING');

  readonly visualFactory = (canvas: HTMLCanvasElement) => {
    this.scene = new VisualSystemsScene(canvas);
    return this.scene;
  };

  ngOnInit(): void {
    this.telemetryText.set('VISUAL SYSTEMS // ACTIVE');
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

  onPointerDown(event: PointerEvent): void {
    if (!this.scene) return;
    this.isDragging = true;
    this.dragStartX = event.clientX;
    this.scene.startDrag(event.clientX);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.scene || !this.isDragging) return;
    this.scene.updateDrag(event.clientX);
  }

  onPointerUp(): void {
    if (!this.scene) return;
    this.isDragging = false;
    this.scene.endDrag();
  }
}
