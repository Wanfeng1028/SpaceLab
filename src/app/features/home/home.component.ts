import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  signal,
  inject,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ThreeCanvasComponent } from '../../three/components/three-canvas/three-canvas.component';
import { HeroLightFieldScene } from '../../three/scenes/hero-particles.scene';
import { LoadingService, LoadingPhase } from '../../shared/services/loading.service';
import { I18nService } from '../../core/services/i18n.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThreeCanvasComponent, RouterLink],
})
export class HomeComponent implements OnInit {
  private router = inject(Router);
  private i18n = inject(I18nService);

  readonly sceneFactory = (canvas: HTMLCanvasElement) => new HeroLightFieldScene(canvas);

  ngOnInit(): void {
    this.i18n.loadTranslations('zh-CN');
  }

  t(key: string): string {
    return this.i18n.t(key);
  }

  onEnter(): void {
    // 引导至 Projects 页面
    this.router.navigate(['/projects']);
  }

  onContact(): void {
    // 唤起邮件联系
    window.location.href = 'mailto:hello@spacelab.dev?subject=Hi Gruev!';
  }
}
