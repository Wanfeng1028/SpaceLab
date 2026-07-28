import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  output,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  viewChild,
  computed,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MediaPlaybackService } from '../../services/media-playback.service';
import {
  MusicTrack,
  resolveMediaUrl,
  pickVideoSource,
} from '../../models/music-track.model';
import { MediaErrorComponent } from '../media-error/media-error.component';

@Component({
  selector: 'app-video-feed-item',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, MediaErrorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'video-feed-item' },
  template: `
    <div class="feed-item">
      <div class="stage">
        <!-- Screen: deep-navy theater inside the sky panel -->
        <div class="stage__screen">
          <!-- Video element: rendered only when active + source available, no auto src -->
          @if (isActive() && videoInfo().src) {
            <video
              #videoElement
              class="stage__video"
              playsinline
              preload="none"
              (ended)="onVideoEnded()"
              (error)="onVideoError()"
            ></video>
          }

          <!-- Center action button (shown when not playing) -->
          @if (!isVideoPlaying()) {
            <button
              mat-fab
              color="primary"
              class="stage__action"
              [attr.aria-label]="state() === 'error' || state() === 'unsupported' ? '视频不可用' : '播放视频'"
              (click)="onActionClick()"
            >
              @if (state() === 'error' || state() === 'unsupported') {
                <mat-icon>error_outline</mat-icon>
              } @else {
                <mat-icon class="stage__action-icon--play">play_arrow</mat-icon>
              }
            </button>
          }

          <!-- Pause button (shown when playing, click to pause) -->
          @if (isVideoPlaying()) {
            <button
              mat-fab
              class="stage__action stage__action--pause"
              aria-label="暂停视频"
              (click)="pauseVideo()"
            >
              <mat-icon>pause</mat-icon>
            </button>
          }

          <!-- Error / Unsupported overlay -->
          @if (state() === 'error' || state() === 'unsupported') {
            <div class="stage__error-overlay">
              <app-media-error
                [message]="errorMessage()"
                [showBackToAudio]="true"
                (retry)="retryVideo()"
                (backToAudio)="backToAudio.emit()"
              />
            </div>
          }
        </div>

        <!-- Info bar: same sky panel, dark navy text -->
        <div class="stage__info">
          <div class="stage__text">
            <h3 class="stage__title">{{ track().title }}</h3>
            <span class="stage__subtitle">{{ track().subtitle }}</span>
          </div>
          <span class="stage__duration">{{ track().duration }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: calc(100dvh - var(--navbar-height, 64px));
        scroll-snap-align: start;
        scroll-snap-stop: always;
      }

      .feed-item {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        /* 顶部为固定导航栏 + 视频模式浮动页头留位 */
        padding: calc(var(--navbar-height, 64px) + 72px) 20px 32px;
        box-sizing: border-box;
      }

      /* ── Stage: sky glass panel (same language as audio side) ── */
      .stage {
        width: min(1280px, 100%);
        padding: 14px 14px 10px;
        border-radius: 20px;
        background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.82),
          rgba(255, 255, 255, 0.52)
        );
        border: 1px solid rgba(255, 255, 255, 0.72);
        box-shadow:
          0 18px 56px rgba(70, 120, 170, 0.12),
          inset 0 1px 0 rgba(255, 255, 255, 0.75);
        backdrop-filter: blur(18px) saturate(140%);
        -webkit-backdrop-filter: blur(18px) saturate(140%);
      }

      /* ── Screen ───────────────────────────────── */
      .stage__screen {
        position: relative;
        border-radius: 14px;
        overflow: hidden;
        background: #0c1a2c;
        aspect-ratio: 16 / 9;
        max-height: calc(100dvh - var(--navbar-height, 64px) - 180px);
        margin: 0 auto;
      }

      .stage__video {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      /* ── Center Action (Material FAB) ─────────── */
      .stage__action {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(1.15);
        z-index: 2;
      }

      .stage__action-icon--play {
        margin-left: 4px;
      }

      .stage__action--pause {
        opacity: 0;
        transition: opacity 300ms;
      }

      .stage__screen:hover .stage__action--pause {
        opacity: 1;
      }

      /* ── Info Bar ─────────────────────────────── */
      .stage__info {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 8px 4px;
      }

      .stage__text {
        min-width: 0;
        display: flex;
        align-items: baseline;
        gap: 10px;
      }

      .stage__title {
        font-size: 1rem;
        font-weight: 600;
        color: rgba(18, 32, 48, 0.88);
        margin: 0;
        white-space: nowrap;
      }

      .stage__subtitle {
        font-size: 0.8rem;
        color: rgba(18, 32, 48, 0.6);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .stage__duration {
        flex-shrink: 0;
        font-size: 0.75rem;
        font-family: 'Roboto Mono', monospace;
        color: rgba(18, 32, 48, 0.5);
      }

      /* ── Error Overlay ────────────────────────── */
      .stage__error-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(248, 252, 255, 0.78);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        z-index: 3;
      }

      /* ── Mobile ───────────────────────────────── */
      @media (max-width: 767px) {
        .feed-item {
          padding: calc(var(--navbar-height, 64px) + 52px) 12px 24px;
        }

        .stage {
          padding: 10px 10px 8px;
          border-radius: 16px;
        }

        .stage__screen {
          aspect-ratio: 16 / 9;
          max-height: none;
        }

        .stage__action {
          transform: translate(-50%, -50%);
        }
      }

      /* ── Reduced Motion ─────────────────────────── */
      @media (prefers-reduced-motion: reduce) {
        .stage__action,
        .stage__action--pause {
          transition: none;
        }
      }
    `,
  ],
})
export class VideoFeedItemComponent implements AfterViewInit, OnDestroy {
  readonly svc = inject(MediaPlaybackService);
  private readonly hostEl = inject(ElementRef<HTMLElement>);

  readonly track = input.required<MusicTrack>();
  readonly isActive = input(false);
  readonly visible = output<string>();
  readonly backToAudio = output();

  readonly videoElement = viewChild<ElementRef<HTMLVideoElement>>('videoElement');

  /** Whether the video is currently playing */
  readonly isVideoPlaying = signal(false);

  /** Per-item video error (not shared across feed) */
  readonly videoError = signal<string | null>(null);

  /** Video source info (HEVC detection) */
  readonly videoInfo = computed(() => pickVideoSource(this.track()));

  /** Error message */
  readonly errorMessage = computed(() => {
    const info = this.videoInfo();
    if (!info.src && info.reason) return info.reason;
    return this.videoError() || '视频加载失败';
  });

  /** Item state */
  readonly state = computed<'idle' | 'playing' | 'error' | 'unsupported'>(() => {
    const info = this.videoInfo();
    if (!info.src && info.reason) return 'unsupported';
    if (this.videoError()) return 'error';
    if (this.isVideoPlaying()) return 'playing';
    return 'idle';
  });

  private observer: IntersectionObserver | null = null;

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.visible.emit(this.track().key);
          }
        }
      },
      { threshold: 0.7 },
    );
    this.observer.observe(this.hostEl.nativeElement);
  }

  ngOnDestroy(): void {
    this.cleanupVideo();
    this.observer?.disconnect();
    this.observer = null;
  }

  /** User clicks play button */
  onActionClick(): void {
    if (this.state() === 'unsupported') return;

    const info = this.videoInfo();
    if (!info.src) return;

    // Tell service this is the active video (pauses audio)
    this.svc.setActiveVideo(this.track().key);

    // Set video src and play programmatically
    const el = this.videoElement()?.nativeElement;
    if (el) {
      const src = resolveMediaUrl(info.src);
      if (el.src !== src) {
        el.src = src;
        el.load();
      }
      el.play()
        .then(() => this.isVideoPlaying.set(true))
        .catch(() => {
          /* autoplay blocked, user clicks again */
        });
    }
  }

  pauseVideo(): void {
    const el = this.videoElement()?.nativeElement;
    if (el) {
      el.pause();
      this.isVideoPlaying.set(false);
    }
  }

  onVideoEnded(): void {
    this.isVideoPlaying.set(false);
  }

  onVideoError(): void {
    this.isVideoPlaying.set(false);
    this.videoError.set('视频加载失败，请检查文件或网络连接。');
  }

  retryVideo(): void {
    this.videoError.set(null);
    this.onActionClick();
  }

  /** Clean up video when item becomes inactive */
  cleanupVideo(): void {
    const el = this.videoElement()?.nativeElement;
    if (el) {
      el.pause();
      el.removeAttribute('src');
      el.load();
    }
    this.isVideoPlaying.set(false);
    this.videoError.set(null);
  }
}
