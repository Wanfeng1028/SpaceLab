import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { ThreeCanvasComponent } from '../../../../three/components/three-canvas/three-canvas.component';
import { EarthFlylineScene } from '../../../../shared/three/earth-flyline/earth-flyline-scene';

@Component({
  selector: 'app-home-earth-flyline',
  templateUrl: './home-earth-flyline.component.html',
  styleUrl: './home-earth-flyline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThreeCanvasComponent, MatButtonModule, MatIconModule, MatSliderModule],
})
export class EarthFlylineSectionComponent {
  readonly brightness = signal(48);
  readonly brightnessOpen = signal(false);
  readonly rotation = signal(0);
  readonly rotationOpen = signal(false);
  private scene: EarthFlylineScene | null = null;

  readonly sceneFactory = (canvas: HTMLCanvasElement) => {
    try {
      this.scene = new EarthFlylineScene(canvas, { autoRotate: true });
      this.scene.setBrightnessPercent(this.brightness());
      return this.scene;
    } catch (e) {
      console.warn('[EarthFlyline] Scene init failed:', e);
      return { init() {}, destroy() {} };
    }
  };

  toggleBrightness(): void {
    this.brightnessOpen.update((open) => !open);
  }

  toggleRotation(): void {
    this.rotationOpen.update((open) => !open);
  }

  setRotation(value: number): void {
    this.rotation.set(value);
    this.scene?.setManualRotationDegrees(value);
  }

  setBrightness(value: number): void {
    this.brightness.set(value);
    this.scene?.setBrightnessPercent(value);
  }

  zoomIn(): void {
    this.scene?.zoomIn();
  }

  zoomOut(): void {
    this.scene?.zoomOut();
  }
}
