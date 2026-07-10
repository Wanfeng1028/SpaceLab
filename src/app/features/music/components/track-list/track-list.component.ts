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
    <mat-nav-list class="track-list">
      @for (track of svc.tracks; track track.key) {
        <mat-list-item
          class="track-item"
          [class.is-active]="svc.currentTrack()?.key === track.key"
          (click)="svc.selectTrack(track.key)"
        >
          <mat-icon matListItemIcon class="track-item__icon">
            @if (svc.currentTrack()?.key === track.key && svc.isPlaying()) {
              equalizer
            } @else {
              play_arrow
            }
          </mat-icon>
          <div matListItemTitle class="track-item__title">{{ track.title }}</div>
          <div matListItemLine class="track-item__meta">
            <span class="track-item__subtitle">{{ track.subtitle }}</span>
            <span class="track-item__duration">{{ track.duration }}</span>
          </div>
        </mat-list-item>
      }
    </mat-nav-list>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .track-list {
        padding-top: 0;
      }

      .track-item {
        cursor: pointer;
        border-left: 3px solid transparent;
        transition: background 150ms, border-color 150ms;
        border-radius: 0;

        &:hover {
          background: var(--mat-sys-surface-variant, rgba(0, 0, 0, 0.04));
        }

        &.is-active {
          border-left-color: var(--mat-sys-primary, #1a73e8);
          background: var(--mat-sys-secondary-container, rgba(26, 115, 232, 0.08));
        }
      }

      .track-item__icon {
        color: var(--mat-sys-on-surface-variant, #666);

        .is-active & {
          color: var(--mat-sys-primary, #1a73e8);
        }
      }

      .track-item__title {
        font-weight: 500;
        font-size: 0.875rem;
      }

      .track-item__meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
      }

      .track-item__subtitle {
        font-size: 0.75rem;
        color: var(--mat-sys-on-surface-variant, #999);
      }

      .track-item__duration {
        font-size: 0.7rem;
        font-family: 'Roboto Mono', monospace;
        color: var(--mat-sys-on-surface-variant, #999);
      }
    `,
  ],
})
export class TrackListComponent {
  readonly svc = inject(MediaPlaybackService);
}
