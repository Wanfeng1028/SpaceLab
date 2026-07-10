import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-media-error',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="media-error">
      <mat-icon class="media-error__icon">error_outline</mat-icon>
      <p class="media-error__message">{{ message() }}</p>
      <div class="media-error__actions">
        <button mat-flat-button (click)="retry.emit()">
          <mat-icon>refresh</mat-icon>
          重试
        </button>
        @if (showBackToAudio()) {
          <button mat-stroked-button (click)="backToAudio.emit()">
            <mat-icon>headphones</mat-icon>
            返回音频版
          </button>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .media-error {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 24px;
        text-align: center;
      }

      .media-error__icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
        color: var(--mat-sys-error, #f44336);
      }

      .media-error__message {
        margin: 0;
        font-size: 0.875rem;
        color: var(--mat-sys-on-surface-variant, #666);
        max-width: 360px;
        line-height: 1.5;
      }

      .media-error__actions {
        display: flex;
        gap: 8px;
        margin-top: 4px;
      }
    `,
  ],
})
export class MediaErrorComponent {
  readonly message = input.required<string>();
  readonly showBackToAudio = input(false);
  readonly retry = output();
  readonly backToAudio = output();
}
