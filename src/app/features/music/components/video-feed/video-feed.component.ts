import {
  Component,
  ChangeDetectionStrategy,
  inject,
  output,
  ViewChildren,
  QueryList,
  OnDestroy,
  ElementRef,
  NgZone,
  signal,
  computed,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MediaPlaybackService } from '../../services/media-playback.service';
import {
  VideoFeedItemComponent,
} from '../video-feed-item/video-feed-item.component';

@Component({
  selector: 'app-video-feed',
  standalone: true,
  imports: [VideoFeedItemComponent, MatIconModule, MatButtonModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'video-feed',
    '(wheel)': 'onWheel($event)',
  },
  template: `
    <div
      class="feed-track"
      [style.transform]="'translateY(-' + currentIndex() * 100 + '%)'"
    >
      @for (track of svc.tracks; track track.key; let i = $index) {
        <app-video-feed-item
          [track]="track"
          [isActive]="i === currentIndex()"
          (backToAudio)="onBackToAudio()"
          (playingStateChange)="onPlayingStateChange($event)"
        />
      }
    </div>

    <!-- Scroll lock button -->
    <button
      mat-mini-fab
      class="feed-lock"
      [class.feed-lock--active]="scrollLocked()"
      (click)="toggleLock()"
      [attr.aria-label]="scrollLocked() ? '解锁滚轮切换' : '锁定滚轮切换'"
      [matTooltip]="scrollLocked() ? '已锁定，点击解锁滚轮切换' : '点击锁定，防止误触滚轮'"
    >
      <mat-icon>{{ scrollLocked() ? 'lock' : 'lock_open' }}</mat-icon>
    </button>

    <!-- Dot indicators -->
    <div class="feed-dots">
      @for (track of svc.tracks; track track.key; let i = $index) {
        <button
          class="feed-dot"
          [class.feed-dot--active]="i === currentIndex()"
          (click)="goTo(i)"
          [attr.aria-label]="'切换到第' + (i + 1) + '个视频'"
        ></button>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        overflow: hidden;
        position: relative;
      }

      .feed-track {
        height: 100%;
        transition: transform 600ms cubic-bezier(0.4, 0, 0.2, 1);
        will-change: transform;
      }

      /* ── Lock button ── */
      .feed-lock {
        position: absolute;
        top: calc(var(--navbar-height, 64px) + 16px);
        right: 24px;
        z-index: 10;
        background: rgba(255, 255, 255, 0.85);
        color: rgba(18, 32, 48, 0.6);
        box-shadow: 0 2px 12px rgba(70, 120, 170, 0.15);
        transition: all 250ms ease;
      }

      .feed-lock--active {
        background: #2f7fe0;
        color: #fff;
      }

      .feed-lock:hover {
        transform: scale(1.1);
      }

      /* ── Dot navigation ── */
      .feed-dots {
        position: absolute;
        right: 24px;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        flex-direction: column;
        gap: 10px;
        z-index: 5;
      }

      .feed-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        border: 2px solid rgba(47, 127, 224, 0.5);
        background: transparent;
        cursor: pointer;
        padding: 0;
        transition: all 250ms ease;
      }

      .feed-dot--active {
        background: #2f7fe0;
        border-color: #2f7fe0;
        transform: scale(1.3);
      }

      .feed-dot:hover:not(.feed-dot--active) {
        border-color: #2f7fe0;
        background: rgba(47, 127, 224, 0.25);
      }

      @media (prefers-reduced-motion: reduce) {
        .feed-track {
          transition: none;
        }
      }
    `,
  ],
})
export class VideoFeedComponent implements OnDestroy {
  readonly svc = inject(MediaPlaybackService);
  readonly backToAudio = output<void>();

  private readonly zone = inject(NgZone);
  private readonly hostEl = inject(ElementRef<HTMLElement>);

  @ViewChildren(VideoFeedItemComponent)
  feedItems!: QueryList<VideoFeedItemComponent>;

  readonly currentIndex = signal(0);

  /** Scroll lock: when true, wheel events are ignored */
  readonly scrollLocked = signal(false);

  /** Lock to prevent rapid wheel spam during transition */
  private locked = false;
  private lockTimer: ReturnType<typeof setTimeout> | null = null;

  onWheel(e: WheelEvent): void {
    e.preventDefault();
    e.stopPropagation();

    if (this.scrollLocked() || this.locked) return;

    const delta = e.deltaY;
    if (Math.abs(delta) < 30) return; // ignore tiny trackpad noise

    const total = this.svc.tracks.length;
    const cur = this.currentIndex();

    if (delta > 0 && cur < total - 1) {
      this.goTo(cur + 1);
    } else if (delta < 0 && cur > 0) {
      this.goTo(cur - 1);
    }
  }

  toggleLock(): void {
    this.scrollLocked.update((v) => !v);
  }

  /** Auto-lock when video starts playing, auto-unlock when stopped */
  onPlayingStateChange(playing: boolean): void {
    if (playing) {
      this.scrollLocked.set(true);
    }
  }

  goTo(index: number): void {
    if (index === this.currentIndex()) return;

    // Cleanup old active video
    const oldItem = this.findItemByIndex(this.currentIndex());
    oldItem?.cleanupVideo();

    this.currentIndex.set(index);

    // Set new active key in service
    const track = this.svc.tracks[index];
    this.svc.activeVideoKey.set(track?.key ?? null);

    // Lock for transition duration
    this.locked = true;
    if (this.lockTimer) clearTimeout(this.lockTimer);
    this.lockTimer = setTimeout(() => {
      this.locked = false;
    }, 700);
  }

  onBackToAudio(): void {
    this.cleanupAllVideos();
    this.backToAudio.emit();
  }

  ngOnDestroy(): void {
    this.cleanupAllVideos();
    if (this.lockTimer) clearTimeout(this.lockTimer);
  }

  private findItemByIndex(index: number): VideoFeedItemComponent | undefined {
    return this.feedItems?.toArray()[index];
  }

  private cleanupAllVideos(): void {
    this.feedItems?.forEach((item) => item.cleanupVideo());
    this.svc.activeVideoKey.set(null);
  }
}
