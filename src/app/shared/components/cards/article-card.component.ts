import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-article-card',
  template: `
    <a class="card-article" [routerLink]="['/article', slug]">
      <div class="card-article__body">
        <span class="card-article__date">{{ date | date: 'yyyy-MM-dd' }}</span>
        <h3 class="card-article__title">{{ title }}</h3>
        <p class="card-article__excerpt">{{ excerpt }}</p>
        <div class="card-article__tags">
          @for (tag of tags; track tag) {
            <span class="tag">{{ tag }}</span>
          }
        </div>
      </div>
    </a>
  `,
  styles: [
    `
      .card-article {
        display: block;
        padding: 32px;
        background: rgba(0, 0, 0, 0.02);
        border-radius: 16px;
        text-decoration: none;
        color: inherit;
        transition: all 0.3s ease;
        height: 100%;
        box-sizing: border-box;

        &:hover {
          background: rgba(0, 0, 0, 0.04);
          transform: translateY(-4px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
        }
      }

      .card-article__body {
        display: flex;
        flex-direction: column;
        gap: 12px;
        height: 100%;
      }

      .card-article__date {
        font-size: 0.8rem;
        color: #6c757d;
        font-variant-numeric: tabular-nums;
        font-weight: 500;
      }

      .card-article__title {
        font-size: 1.375rem;
        font-weight: 600;
        line-height: 1.35;
        color: #1a1a1a;
        letter-spacing: -0.02em;
      }

      .card-article__excerpt {
        font-size: 0.95rem;
        color: #6c757d;
        line-height: 1.6;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
        font-family: 'Georgia', 'Times New Roman', serif;
        flex-grow: 1;
      }

      .card-article__tags {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: auto;
      }

      .tag {
        font-size: 0.75rem;
        color: #495057;
        background: rgba(0, 0, 0, 0.04);
        padding: 4px 10px;
        border-radius: 12px;
        font-weight: 500;
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
}
