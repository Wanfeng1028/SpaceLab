import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { Router } from '@angular/router';
import { EarthFlylineSectionComponent } from '../home/components/home-earth-flyline/home-earth-flyline.component';
import { MoonTreeSectionComponent } from '../home/components/home-blue-moon-tree/home-blue-moon-tree.component';
import { DeviceCapabilityService, DeviceTier } from '../../core/services/device-capability.service';
import { I18nService } from '../../core/services/i18n.service';

type RenderMode = 'full' | 'lightweight' | 'none';

@Component({
  selector: 'app-3d-experience',
  templateUrl: './three-d-experience.component.html',
  styleUrl: './three-d-experience.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EarthFlylineSectionComponent, MoonTreeSectionComponent],
})
export class ThreeDExperienceComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private device = inject(DeviceCapabilityService);
  private i18n = inject(I18nService);

  readonly renderMode = signal<RenderMode>('full');
  readonly deviceTier = signal<DeviceTier>('high');
  readonly showCompatDialog = signal(false);
  readonly activeScene = signal<'earth' | 'tree'>('earth');

  ngOnInit(): void {
    const cap = this.device.capability();
    this.deviceTier.set(cap.tier);

    if (cap.tier === 'unsupported' || cap.tier === 'low') {
      this.renderMode.set('none');
      this.showCompatDialog.set(true);
    } else if (cap.tier === 'medium') {
      this.renderMode.set('lightweight');
    } else {
      this.renderMode.set('full');
    }
  }

  ngOnDestroy(): void {
    // 子组件自己管理场景生命周期
  }

  t(key: string): string {
    return this.i18n.t(key);
  }

  switchScene(scene: 'earth' | 'tree'): void {
    this.activeScene.set(scene);
  }

  closeCompatDialog(): void {
    this.showCompatDialog.set(false);
    if (this.renderMode() === 'none') {
      this.router.navigate(['/']);
    }
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
