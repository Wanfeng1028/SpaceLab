import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '../../core/services/i18n.service';
import { PostService } from '../../core/services/post.service';
import { ArticleRepositoryService } from '../../core/services/article-repository.service';
import { ArticleMetricsService } from '../../core/services/article-metrics.service';
import { ArticleCardComponent } from '../../shared/components/cards/article-card.component';
import { SearchBoxComponent } from '../../shared/components/search-box';
import type { Article, ArticleMeta } from '../../core/models/article.model';
import {
  buildSearchText,
  matchesSearchQuery,
  normalizeSearchText,
} from '../../core/utils/search.utils';

const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';
const WEB3FORMS_ACCESS_KEY = '874ed1fa-0a5f-481a-810f-83d2d2613b36';

@Component({
  selector: 'app-blog',
  templateUrl: './blog.html',
  styleUrl: './blog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ArticleCardComponent, SearchBoxComponent],
})
export class BlogComponent implements OnInit {
  private i18n = inject(I18nService);
  private postService = inject(PostService);
  private articleRepository = inject(ArticleRepositoryService);
  private metricsService = inject(ArticleMetricsService);
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);

  readonly searchQuery = signal('');
  readonly selectedCategory = signal('all');

  // Newsletter form
  readonly newsletterEmail = signal('');
  readonly newsletterSubmitting = signal(false);
  readonly newsletterSuccess = signal(false);
  readonly newsletterError = signal(false);
  readonly newsletterValidationError = signal<string | null>(null);

  // Combined articles from all sources
  readonly allArticles = signal<Article[]>([]);

  readonly categories = signal<string[]>(['all', 'GIS', '开发', '算法', '随笔', '薅羊毛攻略']);

  readonly filteredArticles = computed(() => {
    const query = this.searchQuery();
    const category = this.selectedCategory();

    return this.allArticles().filter((article) => {
      const matchesQuery = matchesSearchQuery(this.getArticleSearchText(article), query);

      const matchesCategory =
        category === 'all' || normalizeSearchText(article.category) === normalizeSearchText(category);

      return matchesQuery && matchesCategory;
    });
  });

  t(key: string): string {
    return this.i18n.t(key);
  }

  getCategoryLabel(cat: string): string {
    const labels: Record<string, string> = {
      all: this.t('common.all'),
      GIS: this.t('admin.catGis'),
      开发: this.t('admin.catDev'),
      算法: this.t('admin.catAlgorithm'),
      随笔: this.t('admin.catEssay'),
      薅羊毛攻略: this.t('admin.catDeals'),
    };
    return labels[cat] ?? cat;
  }

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  ngOnInit(): void {
    // Load github articles in background
    this.destroyRef.onDestroy(() => {
      // cleanup if needed
    });
    this.articleRepository.fetchGithubArticles().catch(() => {
      // non-critical: github fetch failure doesn't block blog page
    });
  }

  // Triggered when github articles finish loading
  constructor() {
    // Combine static + github articles reactively
    this.destroyRef.onDestroy(() => {});

    // Use effect-like pattern: combine static posts + github posts
    const staticArticles: Article[] = this.postService.getAllPosts().map((p) => {
      const metrics = this.metricsService.getMetrics(p.slug);
      return {
        source: 'static' as const,
        slug: p.slug,
        title: p.title,
        date: p.date,
        category: p.category,
        tags: p.tags,
        summary: p.summary,
        cover: p.cover,
        readingTime: p.readingTime,
        prevSlug: p.prevSlug ?? undefined,
        prevTitle: p.prevTitle ?? undefined,
        nextSlug: p.nextSlug ?? undefined,
        nextTitle: p.nextTitle ?? undefined,
        contentHtml: p.contentHtml,
        viewCount: metrics?.viewCount,
        likeCount: metrics?.likeCount,
      };
    });

    // Subscribe to github articles changes
    const checkGithub = () => {
      const githubArticles: ArticleMeta[] = this.articleRepository.githubPosts();
      if (githubArticles.length > 0) {
        const githubAsArticles: Article[] = githubArticles.map((m) => {
          const metrics = this.metricsService.getMetrics(m.slug);
          return {
            ...m,
            contentHtml: '',
            viewCount: metrics?.viewCount,
            likeCount: metrics?.likeCount,
          };
        });
        this.allArticles.set([...staticArticles, ...githubAsArticles]);
      } else {
        this.allArticles.set(staticArticles);
      }
    };

    // Initial set
    checkGithub();

    // Re-check when github articles load
    const checkInterval = setInterval(checkGithub, 2000);
    setTimeout(() => clearInterval(checkInterval), 30000); // stop after 30s
  }

  submitNewsletter(): void {
    // Reset states
    this.newsletterValidationError.set(null);
    this.newsletterSuccess.set(false);
    this.newsletterError.set(false);

    const email = this.newsletterEmail().trim();

    // Validation
    if (!email) {
      this.newsletterValidationError.set(this.t('blog.subscribeErrEmpty'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.newsletterValidationError.set(this.t('blog.subscribeErrInvalid'));
      return;
    }

    // Submit
    this.newsletterSubmitting.set(true);

    this.http
      .post(
        WEB3FORMS_ENDPOINT,
        {
          access_key: WEB3FORMS_ACCESS_KEY,
          subject: 'SpaceLab 新订阅',
          from_name: 'SpaceLab Newsletter',
          email,
          message: `新的 SpaceLab 订阅邮箱: ${email}`,
          source: 'SpaceLab 官网 - 保持同步',
          submittedAt: new Date().toISOString(),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        },
      )
      .subscribe({
        next: () => {
          this.newsletterSubmitting.set(false);
          this.newsletterSuccess.set(true);
          this.newsletterEmail.set('');
        },
        error: () => {
          this.newsletterSubmitting.set(false);
          this.newsletterError.set(true);
        },
      });
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  clearFilters(): void {
    this.selectedCategory.set('all');
  }

  clearAll(): void {
    this.searchQuery.set('');
    this.selectedCategory.set('all');
  }

  private getArticleSearchText(article: Article): string {
    return buildSearchText([
      article.title,
      article.summary,
      article.category,
      article.tags,
      article.slug,
      article.contentHtml,
      article.date,
    ]);
  }
}
