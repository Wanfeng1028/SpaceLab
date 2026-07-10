import {
  Component,
  ChangeDetectionStrategy,
  inject,
  viewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSliderModule } from '@angular/material/slider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MediaPlaybackService } from '../../services/media-playback.service';
import { MediaErrorComponent } from '../media-error/media-error.component';

@Component({
  selector: 'app-audio-player',
  standalone: true,
  imports: [
    MatIconModule,
    MatButtonModule,
    MatSliderModule,
    MatProgressBarModule,
    MatTooltipModule,
    MediaErrorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <audio #audioElement preload="metadata"></audio>

    <div class="now-playing">
      @if (svc.currentTrack(); as track) {
        <div class="now-playing__inner">
          <!-- Artwork -->
          <div
            class="now-playing__artwork"
            [style.background]="track.artworkGradient"
          >
            <mat-icon class="now-playing__artwork-icon">music_note</mat-icon>
            <span class="now-playing__artwork-label">{{ track.subtitle }}</span>
          </div>

          <!-- Info + Controls -->
          <div class="now-playing__controls">
            <h2 class="now-playing__title">{{ track.title }}</h2>
            <span class="now-playing__subtitle">{{ track.subtitle }}</span>

            @if (svc.isBuffering()) {
              <mat-progress-bar
                mode="indeterminate"
                class="now-playing__buffer"
              />
            }

            <!-- Progress -->
            <div class="now-playing__progress">
              <span class="now-playing__time">{{ svc.formatTime(svc.currentTime()) }}</span>
              <mat-slider
                class="now-playing__slider"
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
              <span class="now-playing__time">{{ svc.formatTime(svc.duration()) }}</span>
            </div>

            <!-- Main controls -->
            <div class="now-playing__buttons">
              <button
                mat-icon-button
                class="now-playing__skip"
                matTooltip="上一首"
                (click)="svc.previous()"
              >
                <mat-icon>skip_previous</mat-icon>
              </button>

              <button
                mat-fab
                class="now-playing__play"
                [attr.aria-label]="svc.isPlaying() ? '暂停' : '播放'"
                (click)="svc.togglePlay()"
              >
                <mat-icon>{{ svc.isPlaying() ? 'pause' : 'play_arrow' }}</mat-icon>
              </button>

              <button
                mat-icon-button
                class="now-playing__skip"
                matTooltip="下一首"
                (click)="svc.next()"
              >
                <mat-icon>skip_next</mat-icon>
              </button>
            </div>

            <!-- Volume -->
            <div class="now-playing__volume">
              <button mat-icon-button (click)="toggleMute()">
                <mat-icon>{{ volumeIcon() }}</mat-icon>
              </button>
              <mat-slider
                class="now-playing__volume-slider"
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

            @if (svc.playHint()) {
              <p class="now-playing__hint">请点击歌曲或播放按钮开始</p>
            }

            @if (svc.mediaError(); as err) {
              <app-media-error
                [message]="err"
                (retry)="retryPlayback()"
              />
            }
          </div>
        </div>
      } @else {
        <!-- Empty state -->
        <div class="now-playing__empty">
          <div class="now-playing__artwork now-playing__artwork--empty">
            <mat-icon class="now-playing__artwork-icon">music_note</mat-icon>
          </div>
          <div class="now-playing__controls">
            <h2 class="now-playing__title now-playing__title--empty">
              选择一首歌曲开始播放
            </h2>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .now-playing {
        background: var(--music-surface, #0d1c2d);
        border-radius: 16px;
        padding: clamp(24px, 3vw, 40px);
        min-height: 480px;
        display: flex;
        align-items: center;
      }

      .now-playing__inner,
      .now-playing__empty {
        display: grid;
        grid-template-columns: minmax(200px, 320px) minmax(280px, 1fr);
        align-items: center;
        gap: clamp(24px, 4vw, 56px);
        width: 100%;
      }

      .now-playing__empty {
        grid-template-columns: minmax(160px, 240px) 1fr;
      }

      /* ── Artwork ────────────────────────────────── */
      .now-playing__artwork {
        aspect-ratio: 1;
        border-radius: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        width: clamp(200px, 26vw, 320px);
      }

      .now-playing__artwork--empty {
        background: var(--music-surface-raised, #122840);
        opacity: 0.5;
      }

      .now-playing__artwork-icon {
        font-size: 56px;
        width: 56px;
        height: 56px;
        color: rgba(255, 255, 255, 0.7);
      }

      .now-playing__artwork-label {
        font-size: 0.85rem;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.55);
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      /* ── Controls area ─────────────────────────── */
      .now-playing__controls {
        display: flex;
        flex-direction: column;
        gap: 12px;
        width: 100%;
      }

      .now-playing__title {
        font-size: 1.6rem;
        font-weight: 700;
        margin: 0;
        color: var(--music-text, #f4f8ff);
        letter-spacing: -0.01em;
      }

      .now-playing__title--empty {
        font-weight: 400;
        font-size: 1.1rem;
        color: var(--music-text-secondary, #a9bdd3);
      }

      .now-playing__subtitle {
        font-size: 0.9rem;
        color: var(--music-text-secondary, #a9bdd3);
        margin-top: -8px;
      }

      /* ── Buffer ─────────────────────────────────── */
      .now-playing__buffer {
        height: 3px;
        border-radius: 2px;
      }

      /* ── Progress ───────────────────────────────── */
      .now-playing__progress {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 8px;
      }

      .now-playing__slider {
        flex: 1;
      }

      .now-playing__time {
        font-size: 0.75rem;
        font-family: 'Roboto Mono', monospace;
        color: var(--music-text-secondary, #a9bdd3);
        min-width: 40px;
        text-align: center;
        user-select: none;
      }

      /* ── Buttons ────────────────────────────────── */
      .now-playing__buttons {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 20px;
        margin: 8px 0;
      }

      .now-playing__play {
        width: 64px;
        height: 64px;
        --mat-fab-container-color: var(--music-primary, #4da3ff);
        --mat-fab-icon-color: #fff;
      }

      .now-playing__play mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
      }

      .now-playing__skip {
        width: 48px;
        height: 48px;
        color: var(--music-text-secondary, #a9bdd3);
      }

      .now-playing__skip mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }

      /* ── Volume ─────────────────────────────────── */
      .now-playing__volume {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 4px;
      }

      .now-playing__volume mat-icon {
        color: var(--music-text-secondary, #a9bdd3);
        font-size: 20px;
      }

      .now-playing__volume-slider {
        width: 120px;
      }

      /* ── Hint ───────────────────────────────────── */
      .now-playing__hint {
        text-align: center;
        font-size: 0.75rem;
        color: var(--music-text-secondary, #a9bdd3);
        margin: 4px 0 0;
      }

      /* ── Medium: artwork above, controls below ── */
      @media (max-width: 1099px) {
        .now-playing__inner {
          grid-template-columns: 1fr;
          justify-items: center;
        }

        .now-playing__artwork {
          width: clamp(180px, 40vw, 280px);
        }

        .now-playing__controls {
          align-items: center;
          text-align: center;
        }
      }

      /* ── Mobile ─────────────────────────────────── */
      @media (max-width: 767px) {
        .now-playing {
          min-height: auto;
          padding: 24px 16px;
        }

        .now-playing__inner,
        .now-playing__empty {
          grid-template-columns: 1fr;
          justify-items: center;
        }

        .now-playing__empty .now-playing__artwork {
          width: 160px;
        }

        .now-playing__artwork {
          width: clamp(160px, 50vw, 240px);
        }

        .now-playing__title {
          font-size: 1.3rem;
          text-align: center;
        }

        .now-playing__volume-slider {
          width: 100px;
        }
      }
    `,
  ],
})
export class AudioPlayerComponent implements AfterViewInit, OnDestroy {
  readonly svc = inject(MediaPlaybackService);
  private audioRef = viewChild<ElementRef<HTMLAudioElement>>('audioElement');

  ngAfterViewInit(): void {
    const el = this.audioRef()?.nativeElement;
    if (el) {
      this.svc.attachAudioElement(el);
    }
  }

  ngOnDestroy(): void {
    this.svc.detachAudioElement();
  }

  volumeIcon(): string {
    const vol = this.svc.volume();
    if (vol === 0) return 'volume_off';
    if (vol < 0.5) return 'volume_down';
    return 'volume_up';
  }

  toggleMute(): void {
    if (this.svc.volume() > 0) {
      this.svc.setVolume(0);
    } else {
      this.svc.setVolume(0.8);
    }
  }

  retryPlayback(): void {
    const key = this.svc.currentTrack()?.key;
    if (key) {
      this.svc.selectTrack(key);
    }
  }
}
