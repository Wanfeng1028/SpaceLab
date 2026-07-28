import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MediaPlaybackService } from '../../services/media-playback.service';

@Component({
  selector: 'app-track-list',
  standalone: true,
  imports: [MatListModule, MatIconModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="track-list-panel">
      <div class="track-list-header">
        <h3 class="track-list-header__title">播放队列</h3>
        <span class="track-list-header__count">{{ svc.tracks.length }} 首曲目</span>
      </div>

      <div class="track-list-scroll">
        <mat-nav-list class="track-list__nav">
          @for (track of svc.tracks; track track.key; let i = $index) {
            <mat-list-item
              class="queue-item"
              [class.queue-item--active]="svc.currentTrack()?.key === track.key"
              (click)="svc.selectTrack(track.key)"
            >
              <div matListItemMeta class="queue-item__index">
                @if (svc.currentTrack()?.key === track.key && svc.isPlaying()) {
                  <mat-icon class="queue-item__eq">equalizer</mat-icon>
                } @else {
                  <span>{{ i + 1 }}</span>
                }
              </div>
              <div matListItemTitle class="queue-item__title">{{ track.title }}</div>
              <div matListItemLine class="queue-item__line">
                <span class="queue-item__subtitle">{{ track.subtitle }}</span>
                <span class="queue-item__duration">{{ track.duration }}</span>
              </div>
            </mat-list-item>
          }
        </mat-nav-list>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        min-width: 0;
        min-height: 0;
        height: 100%;
      }

      .track-list-panel {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        background: rgba(255, 255, 255, 0.38);
        border-right: 1px solid rgba(70, 120, 170, 0.14);
      }

      .track-list-header {
        padding: 16px 20px 14px;
        border-bottom: 1px solid rgba(70, 120, 170, 0.14);
        flex-shrink: 0;
      }

      .track-list-header__title {
        font-size: 0.9rem;
        font-weight: 600;
        color: rgba(18, 32, 48, 0.88);
        margin: 0 0 2px;
      }

      .track-list-header__count {
        font-size: 0.75rem;
        color: rgba(18, 32, 48, 0.55);
      }

      .track-list-scroll {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: rgba(70, 120, 170, 0.2) transparent;
      }

      .track-list-scroll::-webkit-scrollbar {
        width: 4px;
      }

      .track-list-scroll::-webkit-scrollbar-thumb {
        background: rgba(70, 120, 170, 0.22);
        border-radius: 2px;
      }

      .track-list__nav {
        padding-top: 0;
      }

      /* ── Queue item ─────────────────────────────── */
      .queue-item {
        cursor: pointer;
        border-left: 3px solid transparent;
        transition: background 120ms, border-color 120ms;
        height: 68px;
      }

      .queue-item:hover {
        background: rgba(105, 180, 255, 0.1);
      }

      .queue-item--active {
        border-left-color: #2f7fe0;
        background: rgba(216, 233, 255, 0.55);
      }

      .queue-item__index {
        font-size: 0.75rem;
        font-family: 'Roboto Mono', monospace;
        color: rgba(18, 32, 48, 0.5);
        min-width: 20px;
        text-align: center;
      }

      .queue-item--active .queue-item__index {
        color: #2f7fe0;
      }

      .queue-item__eq {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: #2f7fe0;
      }

      .queue-item__title {
        font-weight: 500;
        font-size: 0.875rem;
        color: rgba(18, 32, 48, 0.88);
      }

      .queue-item:not(.queue-item--active) .queue-item__title {
        color: rgba(18, 32, 48, 0.68);
      }

      .queue-item__line {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
      }

      .queue-item__subtitle {
        font-size: 0.75rem;
        color: rgba(18, 32, 48, 0.55);
      }

      .queue-item__duration {
        font-size: 0.7rem;
        font-family: 'Roboto Mono', monospace;
        color: rgba(18, 32, 48, 0.45);
      }
    `,
  ],
})
export class TrackListComponent {
  readonly svc = inject(MediaPlaybackService);
}
