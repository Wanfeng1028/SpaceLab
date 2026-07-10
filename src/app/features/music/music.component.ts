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

@Component({
  selector: 'app-music',
  standalone: true,
  imports: [
    MatButtonToggleModule,
    MatIconModule,
    TrackListComponent,
    AudioPlayerComponent,
    VideoFeedComponent,
  ],
  providers: [MediaPlaybackService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="music-shell"
      [class.music-shell--video]="svc.mode() === 'video'"
    >
      <header class="music-header">
        <div class="music-header__text">
          <h1 class="music-header__title">{{ t('music.title') || '音乐台' }}</h1>
          <p class="music-header__subtitle">
            {{ t('music.subtitle') || '传说系列 · 纯音乐精选' }}
          </p>
        </div>
        <mat-button-toggle-group
          [value]="svc.mode()"
          (change)="onModeChange($event.value)"
          hideSingleSelectionIndicator
          class="music-header__toggle"
        >
          <mat-button-toggle value="audio">
            <mat-icon>headphones</mat-icon>
            {{ t('music.audioMode') || '音频' }}
          </mat-button-toggle>
          <mat-button-toggle value="video">
            <mat-icon>videocam</mat-icon>
            {{ t('music.videoMode') || '视频' }}
          </mat-button-toggle>
        </mat-button-toggle-group>
      </header>

      @if (svc.mode() === 'audio') {
        <div class="music-audio-layout">
          <aside class="music-audio-layout__sidebar">
            <app-track-list />
          </aside>
          <main class="music-audio-layout__main">
            <app-audio-player />
          </main>
        </div>
      } @else {
        <app-video-feed />
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: var(--mat-sys-surface, #fafafa);
      }

      /* ── Shell ──────────────────────────────────── */
      .music-shell {
        max-width: 960px;
        margin: 0 auto;
        padding: 80px 24px 60px;
      }

      .music-shell--video {
        max-width: none;
        padding: 0;
        min-height: 100vh;
        background: #0d1117;
      }

      /* ── Header ────────────────────────────────── */
      .music-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        margin-bottom: 32px;
      }

      .music-shell--video .music-header {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 10;
        padding: 16px 24px;
        margin: 0;
        background: linear-gradient(
          to bottom,
          rgba(0, 0, 0, 0.6),
          transparent
        );
      }

      .music-shell--video .music-header__title {
        color: #fff;
      }

      .music-shell--video .music-header__subtitle {
        color: rgba(255, 255, 255, 0.6);
      }

      .music-header__title {
        font-size: 1.5rem;
        font-weight: 600;
        margin: 0 0 4px;
        color: var(--mat-sys-on-surface, #171717);
      }

      .music-header__subtitle {
        font-size: 0.85rem;
        color: var(--mat-sys-on-surface-variant, #666);
        margin: 0;
      }

      /* ── Audio Layout (two-column) ─────────────── */
      .music-audio-layout {
        display: grid;
        grid-template-columns: 320px 1fr;
        gap: 24px;
        align-items: start;
      }

      .music-audio-layout__sidebar {
        background: var(--mat-sys-surface, #fff);
        border-radius: 12px;
        border: 1px solid var(--mat-sys-outline-variant, #e0e0e0);
        overflow: hidden;
      }

      /* ── Mobile ────────────────────────────────── */
      @media (max-width: 767px) {
        .music-shell {
          padding: 60px 16px 40px;
        }

        .music-header {
          flex-direction: column;
          align-items: stretch;
        }

        .music-audio-layout {
          grid-template-columns: 1fr;
        }
      }

      /* ── Reduced Motion ────────────────────────── */
      @media (prefers-reduced-motion: reduce) {
        .music-audio-layout__sidebar {
          transition: none;
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
      this.lenis.stop();
    } else {
      this.lenis.start();
      requestAnimationFrame(() => this.lenis.resize());
    }
  }

  ngOnDestroy(): void {
    this.svc.stopAll();
    this.lenis.start();
    requestAnimationFrame(() => this.lenis.resize());
  }
}
