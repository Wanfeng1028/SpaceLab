import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ThreeCanvasComponent } from '../../../../three/components/three-canvas/three-canvas.component';
import { MatCardModule } from '@angular/material/card';
import { EarthFlylineScene } from '../../../../shared/three/earth-flyline/earth-flyline-scene';
import { I18nService } from '../../../../core/services/i18n.service';

@Component({
  selector: 'app-home-earth-flyline',
  templateUrl: './home-earth-flyline.component.html',
  styleUrl: './home-earth-flyline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThreeCanvasComponent, MatCardModule],
})
export class EarthFlylineSectionComponent {
  private readonly i18n = inject(I18nService);

  readonly sceneFactory = (canvas: HTMLCanvasElement) => {
    try {
      return new EarthFlylineScene(canvas, { autoRotate: true });
    } catch (e) {
      console.warn('[EarthFlyline] Scene init failed:', e);
      return { init() {}, destroy() {} };
    }
  };

  t(key: string): string {
    return this.i18n.t(key);
  }
}
