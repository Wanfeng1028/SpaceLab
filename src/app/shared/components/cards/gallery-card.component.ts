import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-gallery-card',
  template: `
    <div class="card-gallery glass-card-hover" (click)="onClick()">
      <div class="card-gallery__preview" [style.background]="bgColor">
        @if (thumbnail) {
          <img [src]="thumbnail" [alt]="title" loading="lazy" />
        } @else {
          <span class="card-gallery__placeholder">{{ icon }}</span>
        }
      </div>
      <div class="card-gallery__info">
        <h4 class="card-gallery__title">{{ title }}</h4>
        <span class="card-gallery__type">{{ type }}</span>
      </div>
    </div>
  `,
  styles: [
    `
      .card-gallery {
        border-radius: var(--radius-2xl);
        overflow: hidden;
        cursor: pointer;
        transition: transform 0.4s var(--ease-out);

        &:hover {
          transform: scale(1.03);
        }
      }

      .card-gallery__preview {
        aspect-ratio: 4 / 3;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }

      .card-gallery__placeholder {
        font-size: 2rem;
      }

      .card-gallery__info {
        padding: var(--space-md);
        display: flex;
        justify-content: space-between;
        align-items: baseline;
      }

      .card-gallery__title {
        font-size: 0.9rem;
        font-weight: 500;
        color: var(--color-text);
      }

      .card-gallery__type {
        font-size: 0.75rem;
        color: var(--color-text-tertiary);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GalleryCardComponent {
  @Input({ required: true }) title = '';
  @Input() icon = '🖼️';
  @Input() thumbnail = '';
  @Input() type = '';
  @Input() bgColor = 'rgba(0,0,0,0.03)';

  onClick(): void {}
}
