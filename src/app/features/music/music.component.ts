import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnDestroy,
} from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { I18nService } from '../../core/services/i18n.service';
import { LenisScrollService } from '../../core/services/lenis-scroll.service';
import {
  MediaPlaybackService,
  MusicMode,
} from './services/media-playback.service';
import { TrackListComponent } from './components/track-list/track-list.component';
import { AudioPlayerComponent } from './components/audio-player/audio-player.component';
import { VideoFeedComponent } from './components/video-feed/video-feed.component';
import { PlayerBarComponent } from './components/player-bar/player-bar.component';

@Component({
  selector: 'app-music',
  standalone: true,
  imports: [
    MatButtonToggleModule,
    MatIconModule,
    TrackListComponent,
    AudioPlayerComponent,
    VideoFeedComponent,
    PlayerBarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="music-page"
      [class.music-page--video]="svc.mode() === 'video'"
    >
      <div class="music-shell">
        <header class="music-header">
          <div class="music-header__text">
            <p class="music-header__eyebrow">SpaceLab · Side A</p>
            <h1 class="music-header__title">
              {{ t('music.title') }} <em>Medley</em>
            </h1>
            <p class="music-header__subtitle">{{ t('music.subtitle') }}</p>
          </div>
          <mat-button-toggle-group
            [value]="svc.mode()"
            (change)="onModeChange($event.value)"
            hideSingleSelectionIndicator
            class="music-header__toggle"
          >
            <mat-button-toggle value="audio">
              <mat-icon>headphones</mat-icon>
              {{ t('music.audioMode') }}
            </mat-button-toggle>
            <mat-button-toggle value="video">
              <mat-icon>videocam</mat-icon>
              {{ t('music.videoMode') }}
            </mat-button-toggle>
          </mat-button-toggle-group>
        </header>

        @if (svc.mode() === 'audio') {
          <div class="audio-layout">
            <app-track-list />
            <app-audio-player />
          </div>
        } @else {
          <app-video-feed (backToAudio)="onBackToAudio()" />
        }

        @if (svc.mode() === 'audio') {
          <app-player-bar />
        }
      </div>
    </div>
  `,
  styles: [
    `
      /* ── Local Material sky theme（对齐 ai-frontline 浅蓝）── */
      :host {
        --mat-sys-primary: #2f7fe0;
        --mat-sys-on-primary: #ffffff;
        --mat-sys-primary-container: #d8e9ff;
        --mat-sys-on-primary-container: #0b3a75;
        --mat-sys-secondary-container: #e3f0fc;
        --mat-sys-surface: #f8fcff;
        --mat-sys-surface-variant: #eef6fd;
        --mat-sys-surface-container: #eef6fd;
        --mat-sys-on-surface: rgba(18, 32, 48, 0.88);
        --mat-sys-on-surface-variant: rgba(18, 32, 48, 0.62);
        --mat-sys-outline: rgba(70, 120, 170, 0.28);
        --mat-sys-outline-variant: rgba(70, 120, 170, 0.14);
        --mat-sys-error: #d33f49;
        --mat-sys-inverse-surface: #12202f;

        /* Local design tokens */
        --music-bg-start: #f8fcff;
        --music-bg-middle: #f1f7fb;
        --music-bg-end: #f8fbff;
        --music-surface: rgba(255, 255, 255, 0.66);
        --music-surface-raised: #ffffff;
        --music-surface-hover: #e8f3fd;
        --music-primary: #2f7fe0;
        --music-text: rgba(18, 32, 48, 0.88);
        --music-text-secondary: rgba(18, 32, 48, 0.6);
        --music-divider: rgba(70, 120, 170, 0.14);
      }

      /* ── Page（ai-frontline 同款天蓝背景）───────── */
      .music-page {
        min-height: calc(100dvh - var(--navbar-height, 64px));
        /* 顶部留白 = 固定导航栏高度 + 呼吸间距，避免页头被 navbar 遮挡 */
        padding: calc(var(--navbar-height, 64px) + 24px) clamp(20px, 4vw, 56px)
          32px;
        color: var(--music-text);
        background:
          radial-gradient(
            circle at 16% 8%,
            rgba(125, 210, 255, 0.22),
            transparent 30%
          ),
          radial-gradient(
            circle at 84% 14%,
            rgba(178, 160, 255, 0.16),
            transparent 32%
          ),
          linear-gradient(180deg, #f8fcff 0%, #f1f7fb 42%, #f8fbff 100%);
        display: flex;
        flex-direction: column;
      }

      .music-page--video {
        padding: 0;
        height: 100dvh;
        min-height: 0;
        overflow: hidden;
      }

      /* ── Shell (player housing)：浅蓝玻璃壳 ────── */
      .music-shell {
        width: min(1440px, 100%);
        min-height: calc(100dvh - var(--navbar-height, 64px) - 56px);
        margin: 0 auto;
        display: grid;
        grid-template-rows: auto minmax(0, 1fr) auto;
        background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.82),
          rgba(255, 255, 255, 0.52)
        );
        border: 1px solid rgba(255, 255, 255, 0.72);
        border-radius: 16px;
        box-shadow:
          0 18px 56px rgba(70, 120, 170, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.75);
        backdrop-filter: blur(18px) saturate(140%);
        -webkit-backdrop-filter: blur(18px) saturate(140%);
        overflow: hidden;
      }

      .music-page--video .music-shell {
        width: 100%;
        height: 100%;
        min-height: 0;
        background: transparent;
        border: none;
        border-radius: 0;
        box-shadow: none;
        backdrop-filter: none;
        -webkit-backdrop-filter: none;
        overflow: hidden;
      }

      /* ── Header ────────────────────────────────── */
      .music-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        min-height: 80px;
        padding: 8px 24px 20px;
      }

      .music-page--video .music-header {
        position: fixed;
        /* 固定导航栏下方，避免被 navbar 遮挡 */
        top: var(--navbar-height, 64px);
        left: 0;
        right: 0;
        z-index: 10;
        padding: 12px clamp(20px, 4vw, 56px) 16px;
        background: linear-gradient(
          to bottom,
          rgba(248, 252, 255, 0.92),
          transparent
        );
      }

      /* 预览同款 eyebrow：等宽字体 + 大写字距 + 渐变短线 */
      .music-header__eyebrow {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 0 0 10px;
        font-family: 'JetBrains Mono', 'Roboto Mono', Consolas, monospace;
        font-size: 11px;
        letter-spacing: 0.32em;
        text-transform: uppercase;
        color: var(--music-primary);
        opacity: 0.85;
      }

      .music-header__eyebrow::before {
        content: '';
        width: 26px;
        height: 1px;
        background: linear-gradient(90deg, var(--music-primary), transparent);
      }

      .music-header__title {
        margin: 0 0 6px;
        font-family: 'Noto Serif SC', Georgia, 'Songti SC', 'SimSun', serif;
        font-size: clamp(26px, 2.6vw, 34px);
        font-weight: 600;
        line-height: 1.1;
        letter-spacing: 0.01em;
        color: var(--music-text);
      }

      /* 英文名：衬线斜体 + 天空蓝→紫渐变字（浅色主题适配） */
      .music-header__title em {
        font-style: italic;
        background: linear-gradient(100deg, #4fb8f5, #2f7fe0 55%, #7a8ce8);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }

      .music-header__subtitle {
        font-size: 12.5px;
        letter-spacing: 0.06em;
        color: var(--music-text-secondary);
        margin: 0;
      }

      /* ── Mode Toggle ───────────────────────────── */
      .music-header__toggle {
        --mat-standard-button-toggle-background-color: var(--music-surface);
        --mat-standard-button-toggle-text-color: var(--music-text-secondary);
        --mat-standard-button-toggle-selected-state-background-color: var(--music-surface-hover);
        --mat-standard-button-toggle-selected-state-text-color: var(--music-primary);
        /* 预览同款胶囊外形 */
        border-radius: 999px;
        overflow: hidden;
      }

      .music-header__toggle mat-button-toggle {
        border-radius: 999px;
      }

      .music-header__toggle mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        margin-right: 4px;
      }

      /* ── Audio Layout (grid row 2) ─────────────── */
      .audio-layout {
        min-height: 0;
        display: grid;
        grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
        align-items: stretch;
      }

      /* Force child components to fill the grid cell */
      .audio-layout > app-track-list {
        display: flex;
        min-width: 0;
        min-height: 0;
        height: 100%;
      }

      .audio-layout > app-audio-player {
        display: block;
        min-width: 0;
        min-height: 0;
        height: 100%;
      }

      /* ── Responsive: Medium ────────────────────── */
      @media (max-width: 1099px) {
        .audio-layout {
          grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
        }
      }

      /* ── Responsive: Mobile ────────────────────── */
      @media (max-width: 767px) {
        .music-page {
          padding: calc(var(--navbar-height, 64px) + 16px) 12px 24px;
        }

        .music-header {
          flex-direction: column;
          align-items: stretch;
          gap: 12px;
          min-height: auto;
          padding: 8px 16px 16px;
        }

        .audio-layout {
          grid-template-columns: 1fr;
          grid-template-rows: auto 1fr;
        }

        .audio-layout > app-audio-player {
          order: -1;
        }
      }
    `,
  ],
})
export class MusicComponent implements OnDestroy {
  readonly svc = inject(MediaPlaybackService);
  private readonly lenis = inject(LenisScrollService);
  private readonly i18n = inject(I18nService);

  t(key: string): string {
    return this.i18n.t(key);
  }

  onModeChange(mode: MusicMode): void {
    this.svc.setMode(mode);
    if (mode === 'video') {
      this.lenis.destroyInstance();
    } else {
      this.lenis.recreate();
      requestAnimationFrame(() => this.lenis.resize());
    }
  }

  onBackToAudio(): void {
    this.onModeChange('audio');
  }

  ngOnDestroy(): void {
    // 不再 stopAll —— 音频跨页面持续播放
    this.lenis.recreate();
    requestAnimationFrame(() => this.lenis.resize());
  }
}
