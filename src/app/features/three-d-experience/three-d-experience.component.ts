import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  OnDestroy,
  HostListener,
  ElementRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { ThreeCanvasComponent } from '../../three/components/three-canvas/three-canvas.component';
import { EarthObservatoryScene } from '../../three/scenes/earth-observatory.scene';
import { EarthObservatoryLightScene } from '../../three/scenes/earth-observatory-light.scene';
import { MoonTreeScene } from '../../shared/three/moon-tree/moon-tree-scene';
import { DeviceCapabilityService, DeviceTier } from '../../core/services/device-capability.service';
import { I18nService } from '../../core/services/i18n.service';

type RenderMode = 'full' | 'lightweight' | 'none';

@Component({
  selector: 'app-3d-experience',
  templateUrl: './three-d-experience.component.html',
  styleUrl: './three-d-experience.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThreeCanvasComponent],
})
export class ThreeDExperienceComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private device = inject(DeviceCapabilityService);
  private i18n = inject(I18nService);
  private el = inject(ElementRef<HTMLElement>);

  readonly renderMode = signal<RenderMode>('full');
  readonly deviceTier = signal<DeviceTier>('high');
  readonly showCompatDialog = signal(false);
  readonly activeScene = signal<'earth' | 'tree'>('earth');
  readonly showNavLabels = signal(false);

  private earthScene: EarthObservatoryScene | EarthObservatoryLightScene | null = null;
  private treeScene: MoonTreeScene | null = null;

  /** Earth scene factory — high tier gets full scene, medium gets light */
  readonly earthFactory = (canvas: HTMLCanvasElement) => {
    try {
      if (this.renderMode() === 'full') {
        this.earthScene = new EarthObservatoryScene(canvas);
      } else {
        this.earthScene = new EarthObservatoryLightScene(canvas);
      }
      return this.earthScene;
    } catch (e) {
      console.warn('[3D Experience] Earth scene init failed:', e);
      return { init() {}, destroy() {} };
    }
  };

  /** Moon tree scene factory */
  readonly treeFactory = (canvas: HTMLCanvasElement) => {
    try {
      this.treeScene = new MoonTreeScene(canvas);
      return this.treeScene;
    } catch (e) {
      console.warn('[3D Experience] Moon tree scene init failed:', e);
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

  ngOnDestroy(): void {
    this.earthScene?.destroy();
    this.earthScene = null;
    this.treeScene?.destroy();
    this.treeScene = null;
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.earthScene) return;
    const rect = this.el.nativeElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.earthScene.updateMouse(x, y);
  }

  @HostListener('click', ['$event'])
  onEarthClick(event: MouseEvent): void {
    if (this.activeScene() !== 'earth' || !this.earthScene) return;
    this.earthScene.triggerScanWave();
  }

  t(key: string): string {
    return this.i18n.t(key);
  }

  switchScene(scene: 'earth' | 'tree'): void {
    this.activeScene.set(scene);
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  onFallbackClick(): void {
    this.showCompatDialog.set(true);
  }

  closeCompatDialog(): void {
    this.showCompatDialog.set(false);
  }

  toggleNavLabels(): void {
    this.showNavLabels.update((v) => !v);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
