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
          <div class="bar-info__thumb" [style.background]="track.artworkGradient">
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
          <button mat-icon-button class="bar-controls__skip" (click)="svc.previous()">
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
          <button mat-icon-button class="bar-controls__skip" (click)="svc.next()">
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
        min-width: 0;
      }

      .player-bar {
        min-height: 104px;
        display: grid;
        grid-template-columns: minmax(220px, 1fr) minmax(420px, 2fr) minmax(180px, 1fr);
        align-items: center;
        gap: 24px;
        padding: 16px 24px;
        background: #081725;
        border-top: 1px solid rgba(160, 195, 225, 0.12);
      }

      /* ── Left: Info ────────────────────────────── */
      .bar-info {
        display: flex;
        align-items: center;
        gap: 14px;
        min-width: 0;
      }

      .bar-info__thumb {
        width: 56px;
        height: 56px;
        border-radius: 10px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .bar-info__thumb mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
        color: rgba(255, 255, 255, 0.65);
      }

      .bar-info__thumb--empty {
        background: #122840;
        opacity: 0.5;
      }

      .bar-info__text {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      .bar-info__title {
        font-size: 0.9rem;
        font-weight: 600;
        color: #f4f8ff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .bar-info__title--empty {
        color: #a9bdd3;
        font-weight: 400;
      }

      .bar-info__subtitle {
        font-size: 0.78rem;
        color: #a9bdd3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* ── Center: Controls ──────────────────────── */
      .bar-controls {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }

      .bar-controls__buttons {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .bar-controls__skip {
        width: 44px;
        height: 44px;
        color: #a9bdd3;
      }

      .bar-controls__skip mat-icon {
        font-size: 26px;
        width: 26px;
        height: 26px;
      }

      .bar-controls__play {
        width: 56px;
        height: 56px;
        color: #4da3ff;
      }

      .bar-controls__play mat-icon {
        font-size: 34px;
        width: 34px;
        height: 34px;
      }

      .bar-controls__progress {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
      }

      .bar-controls__slider {
        flex: 1;
      }

      .bar-controls__time {
        font-size: 0.75rem;
        font-family: 'Roboto Mono', monospace;
        color: #a9bdd3;
        min-width: 40px;
        text-align: center;
        user-select: none;
      }

      /* ── Right: Volume ─────────────────────────── */
      .bar-volume {
        display: flex;
        align-items: center;
        gap: 6px;
        justify-self: end;
      }

      .bar-volume__btn {
        width: 40px;
        height: 40px;
        color: #a9bdd3;
      }

      .bar-volume__btn mat-icon {
        font-size: 22px;
      }

      .bar-volume__slider {
        width: 130px;
      }

      /* ── Tablet ────────────────────────────────── */
      @media (max-width: 1099px) {
        .player-bar {
          grid-template-columns: minmax(160px, 1fr) minmax(300px, 2fr) auto;
          gap: 16px;
          padding: 12px 16px;
          min-height: 96px;
        }

        .bar-volume__slider {
          width: 90px;
        }
      }

      /* ── Mobile: two-row ───────────────────────── */
      @media (max-width: 767px) {
        .player-bar {
          grid-template-columns: 1fr;
          grid-template-rows: auto auto;
          min-height: auto;
          padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
          gap: 8px;
        }

        .bar-info {
          display: none;
        }

        .bar-volume {
          display: none;
        }

        .bar-controls {
          grid-column: 1;
        }

        .bar-controls__skip {
          width: 40px;
          height: 40px;
        }

        .bar-controls__play {
          width: 48px;
          height: 48px;
        }

        .bar-controls__play mat-icon {
          font-size: 28px;
          width: 28px;
          height: 28px;
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
