import {
  Component,
  ChangeDetectionStrategy,
  inject,
  ViewChildren,
  QueryList,
  AfterViewInit,
  OnDestroy,
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
  host: { class: 'video-feed' },
  template: `
    <div class="feed-scroll">
      @for (track of svc.tracks; track track.key) {
        <app-video-feed-item
          [track]="track"
          [isActive]="svc.activeVideoKey() === track.key"
          (visible)="onItemVisible($event)"
          (backToAudio)="onBackToAudio()"
        />
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100vh;
        overflow: hidden;
      }

      .feed-scroll {
        height: 100%;
        overflow-y: auto;
        scroll-snap-type: y mandatory;
        scrollbar-width: none;
      }

      .feed-scroll::-webkit-scrollbar {
        display: none;
      }
    `,
  ],
})
export class VideoFeedComponent implements AfterViewInit, OnDestroy {
  readonly svc = inject(MediaPlaybackService);

  @ViewChildren(VideoFeedItemComponent)
  feedItems!: QueryList<VideoFeedItemComponent>;

  private currentActiveKey: string | null = null;

  ngAfterViewInit(): void {
    // No additional setup needed; IntersectionObserver is in each item
  }

  ngOnDestroy(): void {
    this.cleanupAllVideos();
  }

  /** Called when an item becomes >= 70% visible */
  onItemVisible(key: string): void {
    if (this.currentActiveKey === key) return;

    // Clean up old active item's video
    if (this.currentActiveKey) {
      const oldItem = this.findItem(this.currentActiveKey);
      oldItem?.cleanupVideo();
    }

    this.currentActiveKey = key;
    this.svc.activeVideoKey.set(key);
  }

  onBackToAudio(): void {
    this.cleanupAllVideos();
    this.svc.setMode('audio');
    // Parent MusicComponent handles Lenis restore via onModeChange
  }

  private findItem(key: string): VideoFeedItemComponent | undefined {
    return this.feedItems?.find((item) => item.track().key === key);
  }

  private cleanupAllVideos(): void {
    this.feedItems?.forEach((item) => item.cleanupVideo());
    this.currentActiveKey = null;
    this.svc.activeVideoKey.set(null);
  }
}
