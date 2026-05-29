import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ThreeCanvasComponent } from '../../../../three/components/three-canvas/three-canvas.component';
import { BlueMoonTreeScene } from '../../../../three/scenes/blue-moon-tree.scene';
import { I18nService } from '../../../../core/services/i18n.service';

@Component({
  selector: 'app-home-blue-moon-tree',
  templateUrl: './home-blue-moon-tree.component.html',
  styleUrl: './home-blue-moon-tree.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThreeCanvasComponent],
})
export class HomeBlueMoonTreeSection {
  private i18n = inject(I18nService);

  sceneFactory = (canvas: HTMLCanvasElement) => new BlueMoonTreeScene(canvas);

  t(key: string): string {
    return this.i18n.t(key);
  }
}
