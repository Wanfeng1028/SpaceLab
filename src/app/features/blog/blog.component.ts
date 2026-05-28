import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/services/i18n.service';
import { PostService } from '../../core/services/post.service';
import { ArticleCardComponent } from '../../shared/components/cards/article-card.component';
import { SearchBoxComponent } from '../../shared/components/search-box';
import type { GeneratedPost } from '../../../generated/content.generated';

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

  readonly searchQuery = signal('');
  readonly selectedCategory = signal('all');

  readonly allPosts = computed(() => this.postService.posts());

  readonly categories = computed(() => {
    const cats = new Set(
      this.allPosts()
        .map((p) => p.category)
        .filter(Boolean),
    );
    return ['all', ...Array.from(cats)];
  });

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

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
  }
}
