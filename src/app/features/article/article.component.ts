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
import { PostService, Post } from '../../core/services/post.service';
import { LiveCommentComponent } from '../../shared/components/live-comment/live-comment.component';
import DOMPurify from 'dompurify';
import { MarkdownRendererService } from '../../core/services/markdown-renderer.service';
import { SeoService } from '../../core/services/seo.service';

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
  private markdownRenderer = inject(MarkdownRendererService);
  private seo = inject(SeoService);

  readonly post = signal<Post | null>(null);
  readonly loading = signal(false);
  readonly sanitizedContent = signal<SafeHtml>('');

  ngOnInit(): void {
    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(async (params) => {
      const slug = params['slug'];
      this.loading.set(true);

      this.postService.getPostBySlug(slug).subscribe({
        next: async (post) => {
          this.post.set(post);
          // Render markdown content to HTML if content is plain markdown
          if (post.content) {
            const html = await this.markdownRenderer.render(post.content);
            this.sanitizedContent.set(this.sanitizer.bypassSecurityTrustHtml(html));
          }
          this.loading.set(false);

          // SEO
          this.seo.setArticle(post.title, post.summary ?? '', post.slug, post.cover_url);

          // Increment view count on the backend
          if (post.id) {
            this.postService.incrementViewCount(post.id).subscribe();
          }
        },
        error: () => {
          this.post.set(null);
          this.loading.set(false);
        },
      });
    });
  }

  t(key: string): string {
    return this.i18n.t(key);
  }

  onLike(): void {
    // TODO: Implement like via backend API when available
  }

  /** Format date for display */
  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  }
}
