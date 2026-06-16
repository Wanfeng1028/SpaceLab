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
import { PostService, Post } from '../../core/services/post.service';
import { LiveCommentComponent } from '../../shared/components/live-comment/live-comment.component';
import DOMPurify from 'dompurify';
import { MarkdownRendererService } from '../../core/services/markdown-renderer.service';
import { SeoService } from '../../core/services/seo.service';
import { POSTS as STATIC_POSTS } from '../../../generated/content.generated';

/** 将静态 GeneratedPost 转为后端 Post 格式 */
function staticToPost(p: typeof STATIC_POSTS[number]): Post {
  return {
    id: p.slug,
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    content: p.contentHtml,
    cover_url: p.cover || '',
    category: p.category,
    tags: p.tags,
    reading_time: p.readingTime,
    status: p.published ? 'published' : 'draft',
    author_id: '',
    language: 'zh-CN',
    created_at: p.date,
    updated_at: p.date,
    published_at: p.date,
    view_count: 0,
  };
}

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
          await this.renderContent(post);
          this.loading.set(false);
          this.seo.setArticle(post.title, post.summary ?? '', post.slug, post.cover_url);
          if (post.id) {
            this.postService.incrementViewCount(post.id).subscribe();
          }
        },
        error: () => {
          // 降级：从静态数据中查找
          const staticPost = STATIC_POSTS.find((p) => p.slug === slug);
          if (staticPost) {
            const post = staticToPost(staticPost);
            this.post.set(post);
            this.renderContent(post);
            this.seo.setArticle(post.title, post.summary ?? '', post.slug, post.cover_url);
          } else {
            this.post.set(null);
          }
          this.loading.set(false);
        },
      });
    });
  }

  private async renderContent(post: Post): Promise<void> {
    if (post.content) {
      // 如果 content 已经是 HTML（静态数据），直接用；否则渲染 markdown
      if (post.content.startsWith('<')) {
        this.sanitizedContent.set(this.sanitizer.bypassSecurityTrustHtml(post.content));
      } else {
        const html = await this.markdownRenderer.render(post.content);
        this.sanitizedContent.set(this.sanitizer.bypassSecurityTrustHtml(html));
      }
    }
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
