import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { Router } from '@angular/router';
import { DeviceCapabilityService, DeviceTier } from '../../core/services/device-capability.service';
import { I18nService } from '../../core/services/i18n.service';
import { HomeLightFieldComponent } from '../home/components/home-light-field/home-light-field.component';
import { EarthFlylineSectionComponent } from '../home/components/home-earth-flyline/home-earth-flyline.component';
import { MoonTreeSectionComponent } from '../home/components/home-blue-moon-tree/home-blue-moon-tree.component';

export type SceneKey = 'lightfield' | 'earth' | 'tree';

@Component({
  selector: 'app-3d-experience',
  templateUrl: './three-d-experience.component.html',
  styleUrl: './three-d-experience.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HomeLightFieldComponent, EarthFlylineSectionComponent, MoonTreeSectionComponent],
})
export class ThreeDExperienceComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private device = inject(DeviceCapabilityService);
  private i18n = inject(I18nService);

  readonly deviceTier = signal<DeviceTier>('high');
  readonly showCompatDialog = signal(false);
  readonly activeScene = signal<SceneKey | null>(null);

  /** 三个场景卡片的配置 */
  readonly sceneCards = [
    {
      key: 'lightfield' as SceneKey,
      icon: '✦',
      titleKey: 'threeD.lightField',
      titleFallback: '光球 / Hero Light Field',
      descKey: 'threeD.lightFieldDesc',
      descFallback: 'WebGL 大气散射日食效果，体积光与粒子系统构成的沉浸式光球体验。',
    },
    {
      key: 'earth' as SceneKey,
      icon: '🌍',
      titleKey: 'threeD.earth',
      titleFallback: '地球飞线 / Globe Stream',
      descKey: 'threeD.earthDesc',
      descFallback: '3D 地球可视化，全球航线飞线与城市灯光粒子效果。',
    },
    {
      key: 'tree' as SceneKey,
      icon: '🌙',
      titleKey: 'threeD.moonTree',
      titleFallback: '蓝月亮树 / Blue Moon Tree',
      descKey: 'threeD.moonTreeDesc',
      descFallback: '粒子生命体在月光下生长，26,000+ 粒子构成一棵会呼吸的数字之树。',
    },
  ];

  ngOnInit(): void {
    const cap = this.device.capability();
    this.deviceTier.set(cap.tier);

    if (cap.tier === 'unsupported' || cap.tier === 'low') {
      this.showCompatDialog.set(true);
    }
  }

  ngOnDestroy(): void {
    // 子组件通过 @if 销毁时自动调用 scene.destroy()
  }

  t(key: string): string {
    return this.i18n.t(key);
  }

  /** 进入指定场景 */
  enterScene(scene: SceneKey): void {
    this.activeScene.set(scene);
  }

  /** 返回卡片选择 */
  backToCards(): void {
    this.activeScene.set(null);
  }

  /** 关闭兼容弹窗 */
  closeCompatDialog(): void {
    this.showCompatDialog.set(false);
    this.router.navigate(['/']);
  }

  goBack(): void {
    if (this.activeScene()) {
      this.backToCards();
    } else {
      this.router.navigate(['/']);
    }
  }
}
