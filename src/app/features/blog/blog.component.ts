import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '../../core/services/i18n.service';
import { PostService, Post } from '../../core/services/post.service';
import { ContentService, Category } from '../../core/services/content.service';
import { ArticleCardComponent } from '../../shared/components/cards/article-card.component';
import { SearchBoxComponent } from '../../shared/components/search-box';
import {
  buildSearchText,
  matchesSearchQuery,
  normalizeSearchText,
} from '../../core/utils/search.utils';
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
  private contentService = inject(ContentService);
  private http = inject(HttpClient);

  readonly searchQuery = signal('');
  readonly selectedCategory = signal('all');
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);

  // Newsletter form
  readonly newsletterEmail = signal('');
  readonly newsletterSubmitting = signal(false);
  readonly newsletterSuccess = signal(false);
  readonly newsletterError = signal(false);
  readonly newsletterValidationError = signal<string | null>(null);

  /** 动态分类列表，从后端加载 */
  readonly categoryList = signal<Category[]>([]);
  readonly categories = computed<string[]>(() => {
    const cats = this.categoryList().map((c) => c.name);
    return ['all', ...cats];
  });

  // All posts from the backend API
  private readonly _allPosts = signal<Post[]>([]);

  readonly filteredArticles = computed(() => {
    const query = this.searchQuery();
    const category = this.selectedCategory();
    const posts = this._allPosts();

    return posts.filter((post) => {
      const searchText = buildSearchText([
        post.title,
        post.summary ?? '',
        post.category,
        post.tags?.join(' ') ?? '',
        post.slug,
      ]);

      const matchesQuery = matchesSearchQuery(searchText, query);

      const matchesCategory =
        category === 'all' || normalizeSearchText(post.category) === normalizeSearchText(category);

      return matchesQuery && matchesCategory;
    });
  });

  t(key: string): string {
    return this.i18n.t(key);
  }

  getCategoryLabel(cat: string): string {
    if (cat === 'all') return this.t('common.all');
    // 从动态分类列表中查找
    const found = this.categoryList().find((c) => c.name === cat);
    return found?.name ?? cat;
  }

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  ngOnInit(): void {
    this.loadCategories();
    this.loadPosts();
  }

  private loadCategories(): void {
    this.contentService.listCategories().subscribe({
      next: (list) => this.categoryList.set(list || []),
      error: () => {
        // 降级：使用硬编码分类
        this.categoryList.set([
          { id: '', slug: 'GIS', name: 'GIS', description: '', icon: '', sort_order: 0, created_at: '', updated_at: '' },
          { id: '', slug: 'dev', name: '开发', description: '', icon: '', sort_order: 0, created_at: '', updated_at: '' },
          { id: '', slug: 'algorithm', name: '算法', description: '', icon: '', sort_order: 0, created_at: '', updated_at: '' },
          { id: '', slug: 'essay', name: '随笔', description: '', icon: '', sort_order: 0, created_at: '', updated_at: '' },
          { id: '', slug: 'deals', name: '薅羊毛攻略', description: '', icon: '', sort_order: 0, created_at: '', updated_at: '' },
        ]);
      },
    });
  }

  loadPosts(): void {
    this.loading.set(true);
    this.loadError.set(null);
    // Fetch all published posts from backend
    this.postService.getPosts(1, 100, 'published').subscribe({
      next: (response) => {
        this._allPosts.set(response.posts ?? []);
        this.loading.set(false);
      },
      error: () => {
        // 降级：使用静态生成的数据
        this._allPosts.set(STATIC_POSTS.map(staticToPost));
        this.loading.set(false);
      },
    });
  }

  submitNewsletter(): void {
    this.newsletterValidationError.set(null);
    this.newsletterSuccess.set(false);
    this.newsletterError.set(false);

    const email = this.newsletterEmail().trim();

    if (!email) {
      this.newsletterValidationError.set(this.t('blog.subscribeErrEmpty'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.newsletterValidationError.set(this.t('blog.subscribeErrInvalid'));
      return;
    }

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

  clearAll(): void {
    this.searchQuery.set('');
    this.selectedCategory.set('all');
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  clearFilters(): void {
    this.selectedCategory.set('all');
  }

  /** Format date for display */
  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  }
}
