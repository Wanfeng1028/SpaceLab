import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ThreeCanvasComponent } from '../../../../three/components/three-canvas/three-canvas.component';
import { MatCardModule } from '@angular/material/card';
import { GlobeStreamScene } from '../../../../shared/three/globe-stream/globe-stream-scene';
import { I18nService } from '../../../../core/services/i18n.service';

@Component({
  selector: 'app-home-earth-flyline',
  templateUrl: './home-earth-flyline.component.html',
  styleUrl: './home-earth-flyline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThreeCanvasComponent, MatCardModule],
})
export class HomeEarthFlylineSection {
  private readonly i18n = inject(I18nService);

  readonly sceneFactory = (canvas: HTMLCanvasElement) =>
    new GlobeStreamScene(canvas, {
      autoRotate: true,
      theme: 'blue',
      showFlyLines: true,
      showPoints: true,
      showGlow: true,
    });

  t(key: string): string {
    return this.i18n.t(key);
  }
}
