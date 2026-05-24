import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  signal,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { ThreeCanvasComponent } from '../../three/components/three-canvas/three-canvas.component';
import { HeroParticlesScene } from '../../three/scenes/hero-particles.scene';
import { LoadingService, LoadingPhase } from '../../shared/services/loading.service';
import { I18nService } from '../../core/services/i18n.service';
import { PortalCardComponent } from '../../shared/components/cards/portal-card.component';
import { ArticleCardComponent } from '../../shared/components/cards/article-card.component';
import { ProjectCardComponent } from '../../shared/components/cards/project-card.component';
import { GalleryCardComponent } from '../../shared/components/cards/gallery-card.component';
import { PulseMetricComponent } from '../../shared/components/pulse-metric/pulse-metric.component';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ThreeCanvasComponent,
    PortalCardComponent,
    ArticleCardComponent,
    ProjectCardComponent,
    GalleryCardComponent,
    PulseMetricComponent,
    SectionHeaderComponent,
  ],
})
export class HomeComponent implements OnInit {
  private router = inject(Router);
  private loadingService = inject(LoadingService);
  private i18n = inject(I18nService);

  readonly phase = signal<LoadingPhase>('loading');
  readonly particlesFactory = (canvas: HTMLCanvasElement) => new HeroParticlesScene(canvas);

  // 占位示例数据 — 后续由 Supabase 替换
  readonly portals = [
    { icon: '📝', title: 'Blog', route: '/blog', description: '文章与思考' },
    { icon: '🚀', title: 'Projects', route: '/projects', description: '项目作品' },
    { icon: '🧪', title: 'Lab', route: '/lab', description: '动效实验' },
    { icon: '🖼️', title: 'Gallery', route: '/gallery', description: '媒体空间' },
  ];

  readonly featuredProjects = [
    { title: 'SpaceLab', slug: 'spacelab', icon: '🌌', description: '个人数字空间网站，基于 Angular 21 + Three.js + GSAP 构建', accentColor: '#1a73e8', stack: ['Angular', 'Three.js', 'GSAP'] },
    { title: '示例项目', slug: 'example', icon: '📦', description: '一个示例项目卡片，展示项目展示区效果', accentColor: '#34a853', stack: ['TypeScript', 'Node.js'] },
  ];

  readonly latestArticles = [
    { title: '你好，世界', slug: 'hello-world', excerpt: '这是 SpaceLab 的第一篇文章，记录建站的初衷和未来的规划。', date: '2025-05-24', tags: ['随笔', '建站'] },
    { title: 'Angular 21 新特性速览', slug: 'angular-21-overview', excerpt: 'Angular 21 带来了全新的信号系统、改进的变更检测和更好的开发体验。', date: '2025-05-20', tags: ['Angular', '前端'] },
  ];

  readonly galleryItems = [
    { title: '光场实验 #1', icon: '💡', type: 'Three.js', bgColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { title: '粒子系统', icon: '✨', type: 'WebGL', bgColor: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { title: '玻璃拟态', icon: '🔮', type: 'CSS', bgColor: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  ];

  readonly pulseMetrics = [
    { value: '12', label: '篇文章' },
    { value: '5', label: '个项目' },
    { value: '8', label: '个实验' },
    { value: '24', label: '张媒体' },
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
    this.router.navigate(['/blog']);
  }

  onContact(): void {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  }

  get showParticles(): boolean {
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

  get animationDone(): boolean {
    return this.phase() === 'done';
  }
}
