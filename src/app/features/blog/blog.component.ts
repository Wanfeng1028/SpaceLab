import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '../../core/services/i18n.service';
import { PostService } from '../../core/services/post.service';
import { ArticleCardComponent } from '../../shared/components/cards/article-card.component';
import { SearchBoxComponent } from '../../shared/components/search-box';
import type { GeneratedPost } from '../../../generated/content.generated';
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
export class BlogComponent {
  private i18n = inject(I18nService);
  private postService = inject(PostService);
  private http = inject(HttpClient);

  readonly searchQuery = signal('');
  readonly selectedCategory = signal('all');

  // Newsletter form
  readonly newsletterEmail = signal('');
  readonly newsletterSubmitting = signal(false);
  readonly newsletterSuccess = signal(false);
  readonly newsletterError = signal(false);
  readonly newsletterValidationError = signal<string | null>(null);

  readonly allPosts = computed(() => this.postService.posts());

  readonly categories = signal<string[]>(['all', 'GIS', '开发', '算法', '随笔', '薅羊毛攻略']);

  readonly filteredPosts = computed(() => {
    const query = this.searchQuery();
    const category = this.selectedCategory();

    return this.allPosts().filter((post) => {
      const matchesQuery = matchesSearchQuery(this.getPostSearchText(post), query);

      const matchesCategory =
        category === 'all' || normalizeSearchText(post.category) === normalizeSearchText(category);

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

  private getPostSearchText(post: GeneratedPost): string {
    return buildSearchText([
      post.title,
      post.summary,
      post.category,
      post.tags,
      post.slug,
      post.contentHtml,
      post.date,
    ]);
  }
}
