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
} from '@angular/core';
import { MediaPlaybackService } from '../../services/media-playback.service';
import {
  VideoFeedItemComponent,
} from '../video-feed-item/video-feed-item.component';

@Component({
  selector: 'app-video-feed',
  standalone: true,
  imports: [VideoFeedItemComponent],
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
        />
      }
    </div>

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

  /** Lock to prevent rapid wheel spam during transition */
  private locked = false;
  private lockTimer: ReturnType<typeof setTimeout> | null = null;

  onWheel(e: WheelEvent): void {
    e.preventDefault();
    e.stopPropagation();

    if (this.locked) return;

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
