import {
  Component,
  inject,
  signal,
  OnInit,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '../../core/services/i18n.service';
import { PostService } from '../../core/services/post.service';
import { ArticleRepositoryService } from '../../core/services/article-repository.service';
import DOMPurify from 'dompurify';
import type { GeneratedPost } from '../../../generated/content.generated';
import type { Article } from '../../core/models/article.model';

@Component({
  selector: 'app-article',
  templateUrl: './article.html',
  styleUrl: './article.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
})
export class ArticleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private i18n = inject(I18nService);
  private sanitizer = inject(DomSanitizer);
  private destroyRef = inject(DestroyRef);
  private postService = inject(PostService);
  private articleRepository = inject(ArticleRepositoryService);

  readonly article = signal<Article | null>(null);
  readonly loading = signal(false);

  ngOnInit(): void {
    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(async (params) => {
      const slug = params['slug'];
      this.loading.set(true);

      // Try repository (static first, then github fallback)
      const article = await this.articleRepository.fetchArticleBySlug(slug);
      this.article.set(article);
      this.loading.set(false);
    });
  }

  t(key: string): string {
    return this.i18n.t(key);
  }

  sanitizeContent(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(DOMPurify.sanitize(html));
  }
}
