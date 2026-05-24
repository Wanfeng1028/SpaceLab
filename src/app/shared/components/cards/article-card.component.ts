import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-article-card',
  template: `
    <a class="card-article glass-card-hover" [routerLink]="['/article', slug]">
      <div class="card-article__body">
        <span class="card-article__date">{{ date | date:'yyyy-MM-dd' }}</span>
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
  styles: [`
    .card-article {
      display: block;
      padding: var(--space-xl);
      border-radius: var(--radius-2xl);
      text-decoration: none;
      color: inherit;
      transition: transform 0.4s var(--ease-out), box-shadow 0.4s var(--ease-out);

      &:hover {
        transform: translateY(-4px);
      }
    }

    .card-article__body {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .card-article__date {
      font-size: 0.8rem;
      color: var(--color-text-tertiary);
      font-variant-numeric: tabular-nums;
    }

    .card-article__title {
      font-size: 1.25rem;
      font-weight: 600;
      line-height: 1.35;
      color: var(--color-text);
    }

    .card-article__excerpt {
      font-size: 0.9rem;
      color: var(--color-text-secondary);
      line-height: 1.55;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card-article__tags {
      display: flex;
      gap: var(--space-xs);
      flex-wrap: wrap;
      margin-top: var(--space-xs);
    }

    .tag {
      font-size: 0.75rem;
      color: var(--color-text-tertiary);
      background: rgba(0, 0, 0, 0.04);
      padding: 2px 8px;
      border-radius: var(--radius-full);
    }
  `],
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
