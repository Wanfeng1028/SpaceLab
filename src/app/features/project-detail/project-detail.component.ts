import { Component, inject, signal, OnInit, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { I18nService } from '../../core/services/i18n.service';
import { ProjectService, Project } from '../../core/services/project.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import DOMPurify from 'dompurify';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="project-detail">
      @if (loading()) {
        <div class="project-detail__loading">加载中...</div>
      } @else if (project(); as p) {
        <!-- Back link -->
        <a routerLink="/projects" class="project-detail__back">
          ← {{ t('projectDetail.backToProjects') }}
        </a>

        <!-- Header -->
        <header class="project-detail__header">
          <h1 class="project-detail__title">{{ p.title }}</h1>
          <div class="project-detail__meta">
            @if (p.language) {
              <span class="project-detail__lang">{{ p.language }}</span>
            }
            <span class="project-detail__date">{{ formatDate(p.updated_at) }}</span>
            <span class="project-detail__views">{{ p.view_count }} views</span>
          </div>
        </header>

        <!-- Links -->
        <div class="project-detail__links">
          @if (p.github_url) {
            <a class="space-button space-button--black space-button--sm" [href]="p.github_url" target="_blank" rel="noopener">
              {{ t('projectDetail.github') }}
            </a>
          }
          @if (p.website_url) {
            <a class="space-button space-button--blue space-button--sm" [href]="p.website_url" target="_blank" rel="noopener">
              {{ t('projectDetail.preview') }}
            </a>
          }
        </div>

        <!-- Tags -->
        @if (p.tags && p.tags.length > 0) {
          <div class="project-detail__tags">
            @for (tag of p.tags; track tag) {
              <span class="project-detail__tag">{{ tag }}</span>
            }
          </div>
        }

        <!-- Cover -->
        @if (p.cover_url) {
          <img class="project-detail__cover" [src]="p.cover_url" [alt]="p.title" loading="lazy" />
        }

        <!-- Description -->
        @if (p.description) {
          <section class="project-detail__section">
            <p class="project-detail__description">{{ p.description }}</p>
          </section>
        }

        <!-- Content (Markdown rendered on the backend) -->
        @if (p.content) {
          <section class="project-detail__section project-detail__content">
            <div [innerHTML]="sanitize(p.content)"></div>
          </section>
        }

        <!-- Technologies -->
        @if (p.technologies && p.technologies.length > 0) {
          <section class="project-detail__section">
            <h3>Technologies</h3>
            <div class="project-detail__tech-list">
              @for (tech of p.technologies; track tech) {
                <span class="project-detail__tech">{{ tech }}</span>
              }
            </div>
          </section>
        }
      } @else {
        <div class="project-detail__not-found">
          <h2>{{ t('projectDetail.comingSoon') }}</h2>
          <a routerLink="/projects" class="space-button space-button--blue space-button--sm">
            ← {{ t('projectDetail.backToProjects') }}
          </a>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; max-width: 800px; margin: 0 auto; padding: 2rem 1rem; }
    .project-detail__back { display: inline-block; margin-bottom: 1.5rem; color: var(--link); text-decoration: none; font-size: 0.9rem; opacity: 0.8; }
    .project-detail__back:hover { opacity: 1; }
    .project-detail__header { margin-bottom: 1.5rem; }
    .project-detail__title { font-size: 2rem; font-weight: 700; margin: 0 0 0.5rem; }
    .project-detail__meta { display: flex; gap: 1rem; font-size: 0.85rem; opacity: 0.7; flex-wrap: wrap; }
    .project-detail__lang { background: rgba(255,255,255,0.1); padding: 0.15rem 0.5rem; border-radius: 4px; }
    .project-detail__links { display: flex; gap: 0.75rem; margin-bottom: 1.5rem; }
    .project-detail__tags { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.5rem; }
    .project-detail__tag { background: rgba(255,255,255,0.08); padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.85rem; }
    .project-detail__cover { width: 100%; max-height: 400px; object-fit: cover; border-radius: 12px; margin-bottom: 2rem; }
    .project-detail__section { margin-bottom: 2rem; }
    .project-detail__description { font-size: 1.1rem; line-height: 1.7; opacity: 0.9; }
    .project-detail__content { line-height: 1.8; }
    .project-detail__tech-list { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .project-detail__tech { background: rgba(100,126,234,0.15); padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.85rem; }
    .project-detail__loading, .project-detail__not-found { text-align: center; padding: 4rem 0; opacity: 0.6; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private i18n = inject(I18nService);
  private projectService = inject(ProjectService);

  readonly project = signal<Project | null>(null);
  readonly loading = signal(false);

  ngOnInit(): void {
    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const slug = params['slug'];
      if (!slug) return;
      this.loading.set(true);
      this.projectService.getProjectBySlug(slug).subscribe({
        next: (p) => {
          this.project.set(p);
          this.loading.set(false);
          this.projectService.incrementViewCount(p.id).subscribe();
        },
        error: () => {
          this.project.set(null);
          this.loading.set(false);
        },
      });
    });
  }

  t(key: string): string {
    return this.i18n.t(key);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  sanitize(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'del', 'code', 'pre', 'blockquote',
        'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'hr', 'img', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'span', 'div',
      ],
      ALLOWED_ATTR: [
        'href', 'src', 'alt', 'title', 'class', 'id',
        'target', 'rel', 'colspan', 'rowspan', 'width', 'height',
      ],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    });
  }
}
