import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-article-card',
  template: `
    <a class="card-article" [routerLink]="['/blog', slug]">
      <div class="card-article__meta">
        <div class="card-article__meta-left">
          @if (category) {
            <span class="card-article__category">{{ category }}</span>
          }
          <time class="card-article__date">{{ date | date: 'yyyy年MM月dd日' }}</time>
        </div>
        @if (readingTime) {
          <span class="card-article__reading">{{ readingTime }} 分钟阅读</span>
        }
      </div>

      <h3 class="card-article__title">{{ title }}</h3>

      @if (excerpt) {
        <p class="card-article__excerpt">{{ excerpt }}</p>
      }

      <div class="card-article__footer">
        @if (tags && tags.length > 0) {
          <div class="card-article__tags">
            @for (tag of tags; track tag) {
              <span class="card-article__tag">{{ tag }}</span>
            }
          </div>
        }
        <span class="card-article__link">
          阅读全文 <span class="card-article__arrow">→</span>
        </span>
      </div>
    </a>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .card-article {
        display: flex;
        flex-direction: column;
        padding: 28px 32px;
        border-radius: var(--radius-xl);
        background:
          linear-gradient(
            148deg,
            rgba(255, 255, 255, 0.22) 0%,
            rgba(255, 255, 255, 0.1) 48%,
            rgba(255, 255, 255, 0.05) 100%
          ),
          rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.46);
        box-shadow:
          0 14px 34px rgba(23, 23, 23, 0.06),
          inset 0 1px 0 rgba(255, 255, 255, 0.62),
          inset 0 -1px 0 rgba(255, 255, 255, 0.12);
        backdrop-filter: blur(14px) saturate(1.2);
        -webkit-backdrop-filter: blur(14px) saturate(1.2);
        text-decoration: none;
        color: inherit;
        position: relative;
        isolation: isolate;
        overflow: hidden;
        transition:
          transform 220ms var(--ease-out),
          box-shadow 220ms var(--ease-out),
          border-color 220ms var(--ease-out);
      }

      .card-article::before {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(circle at 18% 12%, rgba(255, 255, 255, 0.62), transparent 24%),
          linear-gradient(135deg, rgba(255, 255, 255, 0.18), transparent 42%);
        opacity: 0.88;
        border-radius: inherit;
      }

      .card-article:hover {
        transform: translateY(-3px);
        border-color: rgba(255, 255, 255, 0.58);
        box-shadow:
          0 18px 40px rgba(23, 23, 23, 0.08),
          inset 0 1px 0 rgba(255, 255, 255, 0.72),
          inset 0 -1px 0 rgba(255, 255, 255, 0.12);
      }

      .card-article__meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
        position: relative;
        z-index: 1;
      }

      .card-article__meta-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .card-article__category {
        display: inline-flex;
        align-items: center;
        height: 24px;
        padding: 0 12px;
        border-radius: 999px;
        background: rgba(26, 115, 232, 0.12);
        border: 1px solid rgba(26, 115, 232, 0.24);
        color: var(--color-google-blue);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.02em;
      }

      .card-article__date {
        font-size: 13px;
        color: var(--color-text-tertiary);
        font-variant-numeric: tabular-nums;
        font-weight: 500;
      }

      .card-article__reading {
        font-size: 12px;
        color: var(--color-text-tertiary);
        font-weight: 500;
        white-space: nowrap;
      }

      .card-article__title {
        font-size: 1.5rem;
        font-weight: 700;
        line-height: 1.35;
        color: var(--color-text);
        letter-spacing: -0.02em;
        margin-bottom: 12px;
        position: relative;
        z-index: 1;
        font-family: var(--font-display);
      }

      .card-article__excerpt {
        font-size: 0.95rem;
        color: var(--color-text-secondary);
        line-height: 1.7;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
        flex: 1;
        margin-bottom: 20px;
        position: relative;
        z-index: 1;
      }

      .card-article__footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-top: auto;
        position: relative;
        z-index: 1;
      }

      .card-article__tags {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        flex: 1;
        min-width: 0;
      }

      .card-article__tag {
        font-size: 11px;
        color: var(--color-text-tertiary);
        background: rgba(0, 0, 0, 0.04);
        padding: 3px 10px;
        border-radius: 999px;
        font-weight: 600;
        letter-spacing: 0.02em;
      }

      .card-article__link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 700;
        color: var(--color-google-blue);
        white-space: nowrap;
        transition: gap 200ms var(--ease-out);
      }

      .card-article:hover .card-article__link {
        gap: 10px;
      }

      .card-article__arrow {
        transition: transform 200ms var(--ease-out);
      }

      .card-article:hover .card-article__arrow {
        transform: translateX(3px);
      }

      @media (max-width: 767px) {
        .card-article {
          padding: 20px;
        }

        .card-article__meta {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }

        .card-article__title {
          font-size: 1.25rem;
        }

        .card-article__footer {
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .card-article {
          transition: none;
        }
        .card-article:hover {
          transform: none;
        }
        .card-article__link,
        .card-article__arrow {
          transition: none;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe],
})
export class ArticleCardComponent {
  @Input({ required: true }) title = '';
  @Input({ required: true }) slug = '';
  @Input() excerpt = '';
  @Input() date: string | Date = '';
  @Input() tags: string[] = [];
  @Input() category = '';
  @Input() readingTime = 0;
}
