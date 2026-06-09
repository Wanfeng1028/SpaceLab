import {
  Component,
  inject,
  signal,
  OnInit,
  ChangeDetectionStrategy,
  DestroyRef,
  computed,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '../../core/services/i18n.service';
import { PostService } from '../../core/services/post.service';
import { ArticleRepositoryService } from '../../core/services/article-repository.service';
import { ArticleMetricsService } from '../../core/services/article-metrics.service';
import { LiveCommentComponent } from '../../shared/components/live-comment/live-comment.component';
import DOMPurify from 'dompurify';
import type { GeneratedPost } from '../../../generated/content.generated';
import type { Article } from '../../core/models/article.model';

@Component({
  selector: 'app-article',
  templateUrl: './article.html',
  styleUrl: './article.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LiveCommentComponent],
})
export class ArticleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private i18n = inject(I18nService);
  private sanitizer = inject(DomSanitizer);
  private destroyRef = inject(DestroyRef);
  private postService = inject(PostService);
  private articleRepository = inject(ArticleRepositoryService);
  private metricsService = inject(ArticleMetricsService);

  readonly article = signal<Article | null>(null);
  readonly loading = signal(false);

  // Sanitized HTML — computed from article content, only recalculates when content changes
  readonly sanitizedContent = computed(() => {
    const art = this.article();
    if (!art?.contentHtml) return '';
    return this.sanitizer.bypassSecurityTrustHtml(DOMPurify.sanitize(art.contentHtml));
  });

  // Expose for template access (public alias)
  readonly articleMetrics = this.metricsService;

  ngOnInit(): void {
    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(async (params) => {
      const slug = params['slug'];
      this.loading.set(true);

      // Try repository (static first, then github fallback)
      const article = await this.articleRepository.fetchArticleBySlug(slug);
      this.article.set(article);
      this.loading.set(false);

      // Track view after article loads (not in effect to avoid infinite loops)
      if (article?.slug) {
        this.metricsService.trackView(article.slug);
      }
    });
  }

  t(key: string): string {
    return this.i18n.t(key);
  }

  onLike(): void {
    const art = this.article();
    if (art?.slug) {
      this.metricsService.toggleLike(art.slug);
    }
  }
}
