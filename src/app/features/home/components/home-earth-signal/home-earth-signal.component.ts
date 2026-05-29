import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ThreeCanvasComponent } from '../../../../three/components/three-canvas/three-canvas.component';
import { MatCardModule } from '@angular/material/card';
import { EarthSignalScene } from '../../../../three/scenes/earth-signal.scene';
import { I18nService } from '../../../../core/services/i18n.service';

@Component({
  selector: 'app-home-earth-signal',
  templateUrl: './home-earth-signal.component.html',
  styleUrl: './home-earth-signal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThreeCanvasComponent, MatCardModule],
})
export class HomeEarthSignalSection {
  private readonly i18n = inject(I18nService);

  readonly sceneFactory = (canvas: HTMLCanvasElement) => new EarthSignalScene(canvas);

  t(key: string): string {
    return this.i18n.t(key);
  }
}
