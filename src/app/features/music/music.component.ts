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
      class="music-page"
      [class.music-page--video]="svc.mode() === 'video'"
    >
      <div class="music-shell">
        <header class="music-header">
          <div class="music-header__text">
            <h1 class="music-header__title">{{ t('music.title') }}</h1>
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
            <aside class="audio-layout__sidebar">
              <app-track-list />
            </aside>
            <main class="audio-layout__main">
              <app-audio-player />
            </main>
          </div>
        } @else {
          <app-video-feed />
        }
      </div>
    </div>
  `,
  styles: [
    `
      /* ── Local Material blue theme ────────────── */
      :host {
        --mat-sys-primary: #4da3ff;
        --mat-sys-on-primary: #001d35;
        --mat-sys-primary-container: #174f7f;
        --mat-sys-on-primary-container: #d5eaff;
        --mat-sys-secondary-container: #173550;
        --mat-sys-surface: #0d1c2d;
        --mat-sys-surface-variant: #122840;
        --mat-sys-surface-container: #122840;
        --mat-sys-on-surface: #f4f8ff;
        --mat-sys-on-surface-variant: #a9bdd3;
        --mat-sys-outline: rgba(190, 215, 240, 0.28);
        --mat-sys-outline-variant: rgba(190, 215, 240, 0.14);
        --mat-sys-error: #ff6b6b;
        --mat-sys-inverse-surface: #f4f8ff;

        /* Local design tokens */
        --music-bg-start: #061425;
        --music-bg-middle: #0a2342;
        --music-bg-end: #0d3260;
        --music-surface: #0d1c2d;
        --music-surface-raised: #122840;
        --music-surface-hover: #173550;
        --music-primary: #4da3ff;
        --music-text: #f4f8ff;
        --music-text-secondary: #a9bdd3;
        --music-divider: rgba(190, 215, 240, 0.14);
      }

      /* ── Page ──────────────────────────────────── */
      .music-page {
        min-height: calc(100dvh - var(--navbar-height, 64px));
        padding: 32px clamp(20px, 4vw, 64px) 48px;
        color: var(--music-text);
        background: linear-gradient(
          145deg,
          var(--music-bg-start) 0%,
          var(--music-bg-middle) 48%,
          var(--music-bg-end) 100%
        );
      }

      .music-page--video {
        padding: 0;
        background: var(--music-bg-start);
      }

      .music-shell {
        width: min(1440px, 100%);
        margin: 0 auto;
      }

      .music-page--video .music-shell {
        width: 100%;
      }

      /* ── Header ────────────────────────────────── */
      .music-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 24px;
        margin-bottom: 32px;
      }

      .music-page--video .music-header {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 10;
        padding: 16px clamp(20px, 4vw, 64px);
        margin: 0;
        background: linear-gradient(to bottom, rgba(6, 20, 37, 0.85), transparent);
      }

      .music-header__title {
        font-size: 1.6rem;
        font-weight: 700;
        margin: 0 0 4px;
        color: var(--music-text);
        letter-spacing: -0.01em;
      }

      .music-header__subtitle {
        font-size: 0.85rem;
        color: var(--music-text-secondary);
        margin: 0;
      }

      /* ── Mode Toggle ───────────────────────────── */
      .music-header__toggle {
        --mat-standard-button-toggle-background-color: var(--music-surface);
        --mat-standard-button-toggle-text-color: var(--music-text-secondary);
        --mat-standard-button-toggle-selected-state-background-color: var(--music-surface-hover);
        --mat-standard-button-toggle-selected-state-text-color: var(--music-primary);
        border-radius: 12px;
        overflow: hidden;
      }

      .music-header__toggle mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        margin-right: 4px;
      }

      /* ── Audio Layout ──────────────────────────── */
      .audio-layout {
        display: grid;
        grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
        gap: 24px;
        align-items: start;
        min-height: 640px;
      }

      .audio-layout__sidebar {
        background: var(--music-surface);
        border-radius: 16px;
        overflow: hidden;
        max-height: 70vh;
        overflow-y: auto;
        scrollbar-width: none;
      }

      .audio-layout__sidebar::-webkit-scrollbar {
        display: none;
      }

      /* ── Responsive: Medium ────────────────────── */
      @media (max-width: 1099px) {
        .audio-layout {
          grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
          min-height: auto;
        }
      }

      /* ── Responsive: Mobile ────────────────────── */
      @media (max-width: 767px) {
        .music-page {
          padding: 20px 16px 32px;
        }

        .music-header {
          flex-direction: column;
          align-items: stretch;
          gap: 16px;
          margin-bottom: 20px;
        }

        .audio-layout {
          grid-template-columns: 1fr;
          min-height: auto;
        }

        /* 移动端：当前播放区域在队列之前 */
        .audio-layout__sidebar {
          order: 2;
          max-height: none;
        }

        .audio-layout__main {
          order: 1;
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
