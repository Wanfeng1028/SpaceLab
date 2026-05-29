import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
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

@Component({
  selector: 'app-blog',
  templateUrl: './blog.html',
  styleUrl: './blog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArticleCardComponent, SearchBoxComponent],
})
export class BlogComponent {
  private i18n = inject(I18nService);
  private postService = inject(PostService);

  readonly searchQuery = signal('');
  readonly selectedCategory = signal('all');

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

  onSubscribe(): void {
    console.log('Subscribe clicked — static UI, no backend connected.');
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
