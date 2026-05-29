import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { I18nService } from '../../core/services/i18n.service';
import { PostService } from '../../core/services/post.service';
import { ArticleCardComponent } from '../../shared/components/cards/article-card.component';
import { SearchBoxComponent } from '../../shared/components/search-box';
import type { GeneratedPost } from '../../../generated/content.generated';

interface BlogCategory {
  key: string;
  zh: string;
  en: string;
}

const BLOG_CATEGORIES: BlogCategory[] = [
  { key: 'all', zh: '全部', en: 'All' },
  { key: 'GIS 开发', zh: 'GIS 开发', en: 'GIS Dev' },
  { key: '算法', zh: '算法', en: 'Algorithm' },
  { key: '小羊毛', zh: '小羊毛', en: 'Tips' },
  { key: '其他', zh: '其他', en: 'Other' },
];

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

  readonly categories = BLOG_CATEGORIES;

  readonly allPosts = computed(() => this.postService.posts());

  readonly filteredPosts = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const category = this.selectedCategory();

    return this.allPosts().filter((post) => {
      const matchesSearch =
        !query ||
        post.title.toLowerCase().includes(query) ||
        post.summary.toLowerCase().includes(query) ||
        post.tags.some((t) => t.toLowerCase().includes(query));

      const matchesCategory = category === 'all' || post.category === category;

      return matchesSearch && matchesCategory;
    });
  });

  t(key: string): string {
    return this.i18n.t(key);
  }

  getLang(): string {
    return this.i18n.locale().startsWith('zh') ? 'zh' : 'en';
  }

  getCategoryLabel(cat: BlogCategory): string {
    return this.getLang() === 'zh' ? cat.zh : cat.en;
  }

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  onSubscribe(): void {
    console.log('Subscribe clicked — static UI, no backend connected.');
  }
}
