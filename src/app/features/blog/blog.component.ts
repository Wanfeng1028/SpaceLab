import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/services/i18n.service';
import { ArticleCardComponent } from '../../shared/components/cards/article-card.component';
import { SearchBoxComponent } from '../../shared/components/search-box';

interface BlogPost {
  title: string;
  slug: string;
  excerpt: string;
  date: string;
  tags: string[];
  category: string;
}

@Component({
  selector: 'app-blog',
  templateUrl: './blog.html',
  styleUrl: './blog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ArticleCardComponent, SearchBoxComponent],
})
export class BlogComponent {
  private i18n = inject(I18nService);

  readonly searchQuery = signal('');
  readonly selectedCategory = signal('all');

  private readonly postData = [
    { key: 'post0', slug: 'hello-world', date: '2025-05-24', tags: ['随笔', '建站'], category: '随笔' },
    { key: 'post1', slug: 'angular-21-overview', date: '2025-05-20', tags: ['Angular', '前端'], category: '技术' },
    { key: 'post2', slug: 'threejs-particles', date: '2025-05-15', tags: ['Three.js', 'WebGL', '3D'], category: '技术' },
    { key: 'post3', slug: 'glassmorphism-guide', date: '2025-05-10', tags: ['设计', 'CSS'], category: '设计' },
    { key: 'post4', slug: 'dev-tools-2025', date: '2025-05-05', tags: ['工具', '效率'], category: '随笔' },
  ];

  readonly allPosts = computed<BlogPost[]>(() =>
    this.postData.map((p) => ({
      title: this.i18n.t(`blog.${p.key}_title`),
      slug: p.slug,
      excerpt: this.i18n.t(`blog.${p.key}_excerpt`),
      date: p.date,
      tags: p.tags,
      category: p.category,
    }))
  );

  readonly categories = computed(() => {
    const cats = new Set(this.allPosts().map((p) => p.category));
    return ['all', ...Array.from(cats)];
  });

  readonly filteredPosts = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const category = this.selectedCategory();

    return this.allPosts().filter((post) => {
      const matchesSearch =
        !query ||
        post.title.toLowerCase().includes(query) ||
        post.excerpt.toLowerCase().includes(query) ||
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
