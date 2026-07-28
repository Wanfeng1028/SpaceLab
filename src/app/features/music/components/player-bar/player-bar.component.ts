import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
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
    <div class="dock-wrap">
      <div class="dock">
        <!-- 左侧：曲目信息 + 圆形封面 -->
        <div class="dock__track">
          <div
            class="dock__thumb"
            [class.spin]="svc.isPlaying()"
            [style.background]="thumbGradient()"
          >
            <mat-icon class="dock__thumb-icon">music_note</mat-icon>
          </div>
          <div class="dock__text">
            <span class="dock__name">{{
              svc.currentTrack()?.title || '串烧'
            }}</span>
            <span class="dock__sub">{{
              svc.currentTrack()?.subtitle || 'Medley'
            }}</span>
          </div>
        </div>

        <!-- 中央：控制 + 进度 -->
        <div class="dock__center">
          <div class="dock__btns">
            <button
              mat-icon-button
              class="dock__nav"
              aria-label="上一首"
              (click)="svc.previous()"
            >
              <mat-icon>skip_previous</mat-icon>
            </button>
            <button
              mat-fab
              class="dock__play"
              [attr.aria-label]="svc.isPlaying() ? '暂停' : '播放'"
              (click)="svc.togglePlay()"
            >
              <mat-icon>{{
                svc.isPlaying() ? 'pause' : 'play_arrow'
              }}</mat-icon>
            </button>
            <button
              mat-icon-button
              class="dock__nav"
              aria-label="下一首"
              (click)="svc.next()"
            >
              <mat-icon>skip_next</mat-icon>
            </button>
          </div>

          <div class="dock__progress">
            <span class="dock__time">{{
              svc.formatTime(svc.currentTime())
            }}</span>
            <mat-slider
              class="dock__slider"
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
            <span class="dock__time">{{ svc.formatTime(svc.duration()) }}</span>
          </div>
        </div>

        <!-- 右侧：音量 -->
        <div class="dock__right">
          <button mat-icon-button class="dock__vol-icon" (click)="toggleMute()">
            <mat-icon>{{ volumeIcon() }}</mat-icon>
          </button>
          <mat-slider
            class="dock__vol"
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
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
        padding: 0 clamp(20px, 4vw, 56px) 22px;
      }

      /* ── 胶囊底座（定位在中央）─────────────────── */
      .dock-wrap {
        display: flex;
        justify-content: center;
      }

      .dock {
        width: min(1020px, 100%);
        display: grid;
        grid-template-columns: minmax(190px, 1fr) minmax(320px, 2.2fr) minmax(
            150px,
            1fr
          );
        align-items: center;
        gap: clamp(14px, 2vw, 22px);
        padding: 12px 22px;
        border-radius: 999px;
        background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.82),
          rgba(255, 255, 255, 0.52)
        );
        border: 1px solid rgba(255, 255, 255, 0.78);
        box-shadow:
          0 22px 55px rgba(70, 120, 170, 0.16),
          inset 0 1px 0 rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(26px) saturate(140%);
        -webkit-backdrop-filter: blur(26px) saturate(140%);
      }

      /* ── 左侧 ────────────────────────────────── */
      .dock__track {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }

      .dock__thumb {
        width: 46px;
        height: 46px;
        flex-shrink: 0;
        border-radius: 50%;
        background: linear-gradient(145deg, #4fb8f5, #3d8ecf 60%, #7a8ce8);
        box-shadow:
          0 4px 12px rgba(60, 130, 210, 0.22),
          inset 0 1px 0 rgba(255, 255, 255, 0.2);
        display: grid;
        place-items: center;
      }

      .dock__thumb.spin {
        animation: spin 6s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .dock__thumb mat-icon {
        color: rgba(255, 255, 255, 0.92);
        width: 18px;
        height: 18px;
        font-size: 18px;
      }

      .dock__text {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .dock__name {
        font-size: 0.9rem;
        font-weight: 600;
        color: rgba(18, 32, 48, 0.9);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .dock__sub {
        font-size: 11.5px;
        color: rgba(18, 32, 48, 0.55);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* ── 中央控制 ────────────────────────────── */
      .dock__center {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        min-width: 0;
      }

      .dock__btns {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .dock__nav {
        width: 44px;
        height: 44px;
        color: rgba(18, 32, 48, 0.65);
      }

      .dock__nav ::ng-deep .mat-icon {
        font-size: 26px;
        width: 26px;
        height: 26px;
      }

      .dock__play {
        width: 52px;
        height: 52px;
        background: linear-gradient(135deg, #cfeaff, #2f7fe0 60%, #6a5fd6);
        color: #fff !important;
        box-shadow:
          0 8px 26px rgba(47, 127, 224, 0.32),
          inset 0 1px 0 rgba(255, 255, 255, 0.5);
      }

      .dock__play:hover {
        transform: scale(1.06);
        box-shadow:
          0 10px 32px rgba(47, 127, 224, 0.42),
          inset 0 1px 0 rgba(255, 255, 255, 0.5);
      }

      .dock__play mat-icon {
        color: #fff;
        font-size: 26px;
        width: 26px;
        height: 26px;
      }

      /* ── 进度滑条 ────────────────────────────── */
      .dock__progress {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
      }

      .dock__time {
        font-family: 'JetBrains Mono', 'Roboto Mono', Consolas, monospace;
        font-size: 10.5px;
        color: rgba(18, 32, 48, 0.55);
        min-width: 38px;
        text-align: center;
        user-select: none;
      }

      .dock__slider {
        flex: 1;
      }

      /* ── 右侧音量 ────────────────────────────── */
      .dock__right {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 6px;
      }

      .dock__vol-icon {
        width: 40px;
        height: 40px;
        color: rgba(18, 32, 48, 0.6);
      }

      .dock__vol {
        width: 92px;
      }

      /* ── 平板 ────────────────────────────────── */
      @media (max-width: 1099px) {
        .dock {
          grid-template-columns: minmax(160px, 1fr) minmax(240px, 2fr) auto;
          gap: 14px;
          padding: 12px 16px;
        }

        .dock__vol {
          width: 70px;
        }
      }

      /* ── 手机 ────────────────────────────────── */
      @media (max-width: 767px) {
        :host {
          padding: 0 12px 14px;
        }

        .dock {
          grid-template-columns: 1fr;
          border-radius: 26px;
          padding: 14px 16px 18px;
          gap: 8px;
        }

        .dock__track,
        .dock__right {
          display: none;
        }

        .dock__center {
          grid-column: 1;
        }
      }
    `,
  ],
})
export class PlayerBarComponent {
  readonly svc = inject(MediaPlaybackService);

  readonly thumbGradient = computed(
    () => this.svc.currentTrack()?.artworkGradient
      || 'linear-gradient(145deg, #4fb8f5 0%, #3d8ecf 60%, #7a8ce8 100%)'
  );

  toggleMute(): void {
    this.svc.setVolume(this.svc.volume() > 0 ? 0 : 0.8);
  }

  volumeIcon(): string {
    const vol = this.svc.volume();
    if (vol === 0) return 'volume_off';
    if (vol < 0.5) return 'volume_down';
    return 'volume_up';
  }
}
