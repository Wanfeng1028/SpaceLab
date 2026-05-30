import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { ThreeCanvasComponent } from '../../../../three/components/three-canvas/three-canvas.component';
import { MoonTreeScene } from '../../../../shared/three/moon-tree/moon-tree-scene';

@Component({
  selector: 'app-home-blue-moon-tree',
  templateUrl: './home-blue-moon-tree.component.html',
  styleUrl: './home-blue-moon-tree.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThreeCanvasComponent, MatButtonModule, MatIconModule, MatSliderModule],
})
export class MoonTreeSectionComponent {
  readonly brightness = signal(56);
  readonly brightnessOpen = signal(false);
  readonly rotation = signal(0);
  readonly rotationOpen = signal(false);
  private scene: MoonTreeScene | null = null;

  sceneFactory = (canvas: HTMLCanvasElement) => {
    this.scene = new MoonTreeScene(canvas);
    this.scene.setBrightnessPercent(this.brightness());
    return this.scene;
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
