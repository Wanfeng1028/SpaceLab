import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { ThreeCanvasComponent } from '../../../../three/components/three-canvas/three-canvas.component';
import { HeroLightFieldScene } from '../../../../three/scenes/hero-particles.scene';

@Component({
  selector: 'app-home-light-field',
  templateUrl: './home-light-field.component.html',
  styleUrl: './home-light-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThreeCanvasComponent],
})
export class HomeLightFieldComponent {
  private scene: HeroLightFieldScene | null = null;

  readonly sceneFactory = (canvas: HTMLCanvasElement) => {
    try {
      this.scene = new HeroLightFieldScene(canvas);
      // 默认 ECLIPSE preset
      this.scene.updateIntensity(2.8);
      this.scene.updateRotationSpeed(1.05);
      this.scene.updateTints('#b2a8ff', '#fcff42');
      return this.scene;
    } catch (e) {
      console.warn('[LightField] Scene init failed:', e);
      return { init() {}, destroy() {} };
    }
  };
}
