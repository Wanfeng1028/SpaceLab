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
      <!-- Video element: rendered only when active + source available, no auto src -->
      @if (isActive() && videoInfo().src) {
        <video
          #videoElement
          class="feed-item__video"
          playsinline
          preload="none"
          (ended)="onVideoEnded()"
          (error)="onVideoError()"
        ></video>
      }

      <!-- Center action button (shown when not playing) -->
      @if (!isVideoPlaying()) {
        <button class="feed-item__action" (click)="onActionClick()">
          @if (state() === 'error' || state() === 'unsupported') {
            <mat-icon class="feed-item__action-icon">error_outline</mat-icon>
          } @else {
            <mat-icon class="feed-item__action-icon feed-item__action-icon--play">
              play_arrow
            </mat-icon>
          }
        </button>
      }

      <!-- Pause button (shown when playing, click to pause) -->
      @if (isVideoPlaying()) {
        <button class="feed-item__action feed-item__action--pause" (click)="pauseVideo()">
          <mat-icon class="feed-item__action-icon">pause</mat-icon>
        </button>
      }

      <!-- Info overlay at bottom -->
      <div class="feed-item__info">
        <h3 class="feed-item__title">{{ track().title }}</h3>
        <span class="feed-item__subtitle">{{ track().subtitle }}</span>
        <span class="feed-item__duration">{{ track().duration }}</span>
      </div>

      <!-- Error / Unsupported overlay -->
      @if (state() === 'error' || state() === 'unsupported') {
        <div class="feed-item__error-overlay">
          <app-media-error
            [message]="errorMessage()"
            [showBackToAudio]="true"
            (retry)="retryVideo()"
            (backToAudio)="backToAudio.emit()"
          />
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100vh;
        scroll-snap-align: start;
        scroll-snap-stop: always;
      }

      .feed-item {
        position: relative;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #0d1117;
        overflow: hidden;
      }

      /* ── Video ──────────────────────────────────── */
      .feed-item__video {
        width: 100%;
        height: 100%;
        object-fit: contain;
        background: #000;
      }

      /* ── Center Action ──────────────────────────── */
      .feed-item__action {
        position: absolute;
        width: 72px;
        height: 72px;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.3);
        background: rgba(0, 0, 0, 0.4);
        color: #fff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition:
          background 200ms,
          border-color 200ms,
          transform 200ms;
        z-index: 2;
      }

      .feed-item__action:hover {
        background: rgba(0, 0, 0, 0.6);
        border-color: rgba(255, 255, 255, 0.5);
        transform: scale(1.05);
      }

      .feed-item__action--pause {
        opacity: 0;
        transition: opacity 300ms;
      }

      .feed-item:hover .feed-item__action--pause {
        opacity: 1;
      }

      .feed-item__action-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
      }

      .feed-item__action-icon--play {
        margin-left: 4px;
      }

      /* ── Info Overlay ───────────────────────────── */
      .feed-item__info {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 40px 24px 24px;
        background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
        display: flex;
        align-items: baseline;
        gap: 8px;
        z-index: 1;
      }

      .feed-item__title {
        font-size: 1rem;
        font-weight: 600;
        color: #fff;
        margin: 0;
      }

      .feed-item__subtitle {
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.6);
      }

      .feed-item__duration {
        margin-left: auto;
        font-size: 0.75rem;
        font-family: 'Roboto Mono', monospace;
        color: rgba(255, 255, 255, 0.5);
      }

      /* ── Error Overlay ──────────────────────────── */
      .feed-item__error-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.6);
        z-index: 3;
      }

      /* ── Reduced Motion ─────────────────────────── */
      @media (prefers-reduced-motion: reduce) {
        .feed-item__action,
        .feed-item__action--pause {
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

  /** Video source info (HEVC detection) */
  readonly videoInfo = computed(() => pickVideoSource(this.track()));

  /** Error message */
  readonly errorMessage = computed(() => {
    const info = this.videoInfo();
    if (!info.src && info.reason) return info.reason;
    return this.svc.mediaError() || '视频加载失败';
  });

  /** Item state */
  readonly state = computed<'idle' | 'playing' | 'error' | 'unsupported'>(() => {
    const info = this.videoInfo();
    if (!info.src && info.reason) return 'unsupported';
    if (this.svc.mediaError()) return 'error';
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
    this.svc.mediaError.set('视频加载失败，请检查文件或网络连接。');
  }

  retryVideo(): void {
    this.svc.mediaError.set(null);
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
  }
}
