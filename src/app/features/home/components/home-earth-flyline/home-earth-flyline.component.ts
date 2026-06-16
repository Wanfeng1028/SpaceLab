import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { ThreeCanvasComponent } from '../../../../three/components/three-canvas/three-canvas.component';
import { EarthFlylineScene } from '../../../../shared/three/earth-flyline/earth-flyline-scene';
import { DeviceCapabilityService, DeviceTier } from '../../../../core/services/device-capability.service';

type RenderMode = 'full' | 'lightweight' | 'none';

@Component({
  selector: 'app-home-earth-flyline',
  templateUrl: './home-earth-flyline.component.html',
  styleUrl: './home-earth-flyline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThreeCanvasComponent, MatButtonModule, MatIconModule, MatDialogModule],
})
export class EarthFlylineSectionComponent implements OnInit {
  private router = inject(Router);
  private device = inject(DeviceCapabilityService);

  readonly renderMode = signal<RenderMode>('full');
  readonly deviceTier = signal<DeviceTier>('high');
  readonly showDialog = signal(false);

  private scene: EarthFlylineScene | null = null;

  readonly sceneFactory = (canvas: HTMLCanvasElement) => {
    try {
      this.scene = new EarthFlylineScene(canvas, { autoRotate: true });
      return this.scene;
    } catch (e) {
      console.warn('[EarthFlyline] Scene init failed:', e);
      return { init() {}, destroy() {} };
    }
  };

  ngOnInit(): void {
    const cap = this.device.capability();
    this.deviceTier.set(cap.tier);

    if (cap.tier === 'unsupported' || cap.tier === 'low') {
      this.renderMode.set('none');
    } else if (cap.tier === 'medium') {
      this.renderMode.set('lightweight');
    } else {
      this.renderMode.set('full');
    }
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  /** 点击已加载的 3D 时导航到 Blog */
  onSceneClick(): void {
    this.navigateTo('/blog');
  }

  /** 点击未加载区域时显示弹窗说明 */
  onFallbackClick(): void {
    this.showDialog.set(true);
  }

  closeDialog(): void {
    this.showDialog.set(false);
  }

  /** 场景上的标签导航 */
  navigateBlog(): void { this.navigateTo('/blog'); }
  navigateProjects(): void { this.navigateTo('/projects'); }
  navigateAbout(): void { this.navigateTo('/about'); }
}
