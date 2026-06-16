import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { ThreeCanvasComponent } from '../../../../three/components/three-canvas/three-canvas.component';
import { MoonTreeScene } from '../../../../shared/three/moon-tree/moon-tree-scene';
import { DeviceCapabilityService, DeviceTier } from '../../../../core/services/device-capability.service';

type RenderMode = 'full' | 'lightweight' | 'none';

@Component({
  selector: 'app-home-blue-moon-tree',
  templateUrl: './home-blue-moon-tree.component.html',
  styleUrl: './home-blue-moon-tree.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThreeCanvasComponent, MatButtonModule, MatIconModule, MatDialogModule],
})
export class MoonTreeSectionComponent implements OnInit {
  private router = inject(Router);
  private device = inject(DeviceCapabilityService);

  readonly renderMode = signal<RenderMode>('full');
  readonly deviceTier = signal<DeviceTier>('high');
  readonly showDialog = signal(false);

  private scene: MoonTreeScene | null = null;

  readonly sceneFactory = (canvas: HTMLCanvasElement) => {
    try {
      this.scene = new MoonTreeScene(canvas);
      return this.scene;
    } catch (e) {
      console.warn('[MoonTree] Scene init failed:', e);
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

  /** 点击已加载的 3D 时导航到 Lab */
  onSceneClick(): void {
    this.navigateTo('/lab');
  }

  /** 点击未加载区域时显示弹窗说明 */
  onFallbackClick(): void {
    this.showDialog.set(true);
  }

  closeDialog(): void {
    this.showDialog.set(false);
  }

  /** 场景上的标签导航 */
  navigateLab(): void { this.navigateTo('/lab'); }
  navigateGallery(): void { this.navigateTo('/ai-frontline'); }
  navigateArchive(): void { this.navigateTo('/archive'); }
}
