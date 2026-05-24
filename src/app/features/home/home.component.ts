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

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThreeCanvasComponent],
})
export class HomeComponent implements OnInit {
  private router = inject(Router);
  private loadingService = inject(LoadingService);
  private i18n = inject(I18nService);

  readonly phase = signal<LoadingPhase>('loading');
  readonly particlesFactory = (canvas: HTMLCanvasElement) => new HeroParticlesScene(canvas);

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
    const p = this.phase();
    return p !== 'loading';
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
