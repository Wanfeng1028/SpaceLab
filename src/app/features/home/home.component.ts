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
  private loadingService = inject(LoadingService);
  private i18n = inject(I18nService);

  readonly phase = signal<LoadingPhase>('loading');
  readonly sceneFactory = (canvas: HTMLCanvasElement) => new HeroLightFieldScene(canvas);

  readonly portalNodes = [
    { label: 'Blog', route: '/blog', subtitle: '文章与思考' },
    { label: 'Projects', route: '/projects', subtitle: '项目作品' },
    { label: 'Lab', route: '/lab', subtitle: '动效实验' },
    { label: 'Gallery', route: '/gallery', subtitle: '媒体空间' },
  ];

  ngOnInit(): void {
    this.i18n.loadTranslations('zh-CN');
    this.loadingService.startHeroSequence();
    this.loadingService.phase.subscribe((p) => this.phase.set(p));
  }

  t(key: string): string {
    return this.i18n.t(key);
  }

  onEnter(): void {
    document.getElementById('portal')?.scrollIntoView({ behavior: 'smooth' });
  }

  onContact(): void {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  }

  get showScene(): boolean {
    return this.phase() !== 'loading';
  }

  get showText(): boolean {
    const p = this.phase();
    return p === 'text' || p === 'buttons' || p === 'done';
  }

  get showButtons(): boolean {
    const p = this.phase();
    return p === 'buttons' || p === 'done';
  }
}
