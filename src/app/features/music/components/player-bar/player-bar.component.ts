import {
  Component,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSliderModule } from '@angular/material/slider';
import { MediaPlaybackService } from '../../services/media-playback.service';

@Component({
  selector: 'app-player-bar',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, MatSliderModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="player-bar">
      <!-- Left: Track info -->
      <div class="bar-info">
        @if (svc.currentTrack(); as track) {
          <div
            class="bar-info__thumb"
            [style.background]="track.artworkGradient"
          >
            <mat-icon>music_note</mat-icon>
          </div>
          <div class="bar-info__text">
            <span class="bar-info__title">{{ track.title }}</span>
            <span class="bar-info__subtitle">{{ track.subtitle }}</span>
          </div>
        } @else {
          <div class="bar-info__thumb bar-info__thumb--empty">
            <mat-icon>music_note</mat-icon>
          </div>
          <div class="bar-info__text">
            <span class="bar-info__title bar-info__title--empty">未选择曲目</span>
          </div>
        }
      </div>

      <!-- Center: Controls + Progress -->
      <div class="bar-controls">
        <div class="bar-controls__buttons">
          <button mat-icon-button class="bar-controls__btn" (click)="svc.previous()">
            <mat-icon>skip_previous</mat-icon>
          </button>
          <button
            mat-icon-button
            class="bar-controls__play"
            [attr.aria-label]="svc.isPlaying() ? '暂停' : '播放'"
            (click)="svc.togglePlay()"
          >
            <mat-icon>{{ svc.isPlaying() ? 'pause' : 'play_arrow' }}</mat-icon>
          </button>
          <button mat-icon-button class="bar-controls__btn" (click)="svc.next()">
            <mat-icon>skip_next</mat-icon>
          </button>
        </div>
        <div class="bar-controls__progress">
          <span class="bar-controls__time">{{ svc.formatTime(svc.currentTime()) }}</span>
          <mat-slider
            class="bar-controls__slider"
            [min]="0"
            [max]="svc.duration() || 1"
            [step]="1"
            [discrete]="true"
          >
            <input
              matSliderThumb
              [value]="svc.currentTime()"
              (valueChange)="svc.seek($event)"
            />
          </mat-slider>
          <span class="bar-controls__time">{{ svc.formatTime(svc.duration()) }}</span>
        </div>
      </div>

      <!-- Right: Volume -->
      <div class="bar-volume">
        <button mat-icon-button class="bar-volume__btn" (click)="toggleMute()">
          <mat-icon>{{ volumeIcon() }}</mat-icon>
        </button>
        <mat-slider
          class="bar-volume__slider"
          [min]="0"
          [max]="1"
          [step]="0.05"
        >
          <input
            matSliderThumb
            [value]="svc.volume()"
            (valueChange)="svc.setVolume($event)"
          />
        </mat-slider>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        position: sticky;
        bottom: 0;
        z-index: 10;
      }

      .player-bar {
        display: grid;
        grid-template-columns: minmax(180px, 260px) 1fr auto;
        align-items: center;
        gap: 16px;
        height: 80px;
        padding: 0 24px;
        background: rgba(8, 20, 40, 0.92);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border-top: 1px solid var(--music-divider, rgba(190, 215, 240, 0.14));
      }

      /* ── Left: Info ────────────────────────────── */
      .bar-info {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }

      .bar-info__thumb {
        width: 48px;
        height: 48px;
        border-radius: 8px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .bar-info__thumb mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: rgba(255, 255, 255, 0.6);
      }

      .bar-info__thumb--empty {
        background: var(--music-surface-raised, #122840);
        opacity: 0.5;
      }

      .bar-info__text {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .bar-info__title {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--music-text, #f4f8ff);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .bar-info__title--empty {
        color: var(--music-text-secondary, #a9bdd3);
        font-weight: 400;
      }

      .bar-info__subtitle {
        font-size: 0.75rem;
        color: var(--music-text-secondary, #a9bdd3);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* ── Center: Controls ──────────────────────── */
      .bar-controls {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        min-width: 0;
      }

      .bar-controls__buttons {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .bar-controls__btn {
        width: 36px;
        height: 36px;
        color: var(--music-text-secondary, #a9bdd3);
      }

      .bar-controls__btn mat-icon {
        font-size: 22px;
        width: 22px;
        height: 22px;
      }

      .bar-controls__play {
        width: 40px;
        height: 40px;
        color: var(--music-primary, #4da3ff);
      }

      .bar-controls__play mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }

      .bar-controls__progress {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
      }

      .bar-controls__slider {
        flex: 1;
      }

      .bar-controls__time {
        font-size: 0.7rem;
        font-family: 'Roboto Mono', monospace;
        color: var(--music-text-secondary, #a9bdd3);
        min-width: 36px;
        text-align: center;
        user-select: none;
      }

      /* ── Right: Volume ─────────────────────────── */
      .bar-volume {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .bar-volume__btn {
        width: 36px;
        height: 36px;
        color: var(--music-text-secondary, #a9bdd3);
      }

      .bar-volume__btn mat-icon {
        font-size: 20px;
      }

      .bar-volume__slider {
        width: 100px;
      }

      /* ── Tablet ────────────────────────────────── */
      @media (max-width: 1099px) {
        .player-bar {
          grid-template-columns: minmax(140px, 200px) 1fr auto;
          gap: 12px;
          padding: 0 16px;
        }

        .bar-volume__slider {
          width: 80px;
        }
      }

      /* ── Mobile: two-row layout ────────────────── */
      @media (max-width: 767px) {
        .player-bar {
          grid-template-columns: 1fr auto;
          grid-template-rows: auto auto;
          height: auto;
          padding: 8px 12px calc(8px + env(safe-area-inset-bottom));
          gap: 4px 8px;
        }

        .bar-info {
          grid-column: 1;
          grid-row: 1;
        }

        .bar-volume {
          grid-column: 2;
          grid-row: 1;
        }

        .bar-controls {
          grid-column: 1 / -1;
          grid-row: 2;
        }

        .bar-info__thumb {
          width: 40px;
          height: 40px;
        }

        .bar-volume__slider {
          width: 60px;
        }
      }
    `,
  ],
})
export class PlayerBarComponent {
  readonly svc = inject(MediaPlaybackService);

  toggleMute(): void {
    if (this.svc.volume() > 0) {
      this.svc.setVolume(0);
    } else {
      this.svc.setVolume(0.8);
    }
  }

  volumeIcon(): string {
    const vol = this.svc.volume();
    if (vol === 0) return 'volume_off';
    if (vol < 0.5) return 'volume_down';
    return 'volume_up';
  }
}
