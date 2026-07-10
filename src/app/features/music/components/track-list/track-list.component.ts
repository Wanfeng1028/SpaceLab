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
    <div class="queue">
      <div class="queue__header">
        <h3 class="queue__title">播放队列</h3>
        <span class="queue__count">{{ svc.tracks.length }} 首曲目</span>
      </div>

      <mat-nav-list class="queue__list">
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
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .queue__header {
        padding: 16px 16px 12px;
        border-bottom: 1px solid var(--music-divider, rgba(190, 215, 240, 0.14));
      }

      .queue__title {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--music-text, #f4f8ff);
        margin: 0 0 2px;
      }

      .queue__count {
        font-size: 0.75rem;
        color: var(--music-text-secondary, #a9bdd3);
      }

      .queue__list {
        padding-top: 0;
      }

      /* ── Queue item ─────────────────────────────── */
      .queue-item {
        cursor: pointer;
        border-left: 3px solid transparent;
        transition: background 120ms, border-color 120ms;
        height: 68px;

        &:hover {
          background: var(--music-surface-hover, #173550);
        }

        &.queue-item--active {
          border-left-color: var(--music-primary, #4da3ff);
          background: var(--music-surface-raised, #122840);
        }
      }

      .queue-item__index {
        font-size: 0.75rem;
        font-family: 'Roboto Mono', monospace;
        color: var(--music-text-secondary, #a9bdd3);
        min-width: 20px;
        text-align: center;

        .queue-item--active & {
          color: var(--music-primary, #4da3ff);
        }
      }

      .queue-item__eq {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: var(--music-primary, #4da3ff);
      }

      .queue-item__title {
        font-weight: 500;
        font-size: 0.875rem;
        color: var(--music-text, #f4f8ff);

        .queue-item:not(.queue-item--active) & {
          color: var(--music-text-secondary, #a9bdd3);
        }
      }

      .queue-item__line {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
      }

      .queue-item__subtitle {
        font-size: 0.75rem;
        color: var(--music-text-secondary, #a9bdd3);
        opacity: 0.7;
      }

      .queue-item__duration {
        font-size: 0.7rem;
        font-family: 'Roboto Mono', monospace;
        color: var(--music-text-secondary, #a9bdd3);
        opacity: 0.6;
      }
    `,
  ],
})
export class TrackListComponent {
  readonly svc = inject(MediaPlaybackService);
}
