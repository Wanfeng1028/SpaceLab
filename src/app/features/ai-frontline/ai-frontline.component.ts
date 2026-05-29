import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/services/i18n.service';
import {
  buildSearchText,
  matchesSearchQuery,
  normalizeSearchText,
} from '../../core/utils/search.utils';

export interface AiNewsItem {
  id: string;
  date: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  category: 'model' | 'product' | 'funding' | 'opensource' | 'agent' | 'tool' | 'industry';
  tags: string[];
  fetchedAt: string;
}

export interface AiFrontlineSource {
  name: string;
  url: string;
  description: string;
  lastFetchedAt: string;
  contentStartDate?: string;
  notice: string;
}

const CONTENT_START_DATE = '2026-05-25';

function isAfterContentStartDate(itemDate: string | undefined): boolean {
  if (!itemDate) return true;
  return itemDate.slice(0, 10) >= CONTENT_START_DATE;
}

@Component({
  selector: 'app-ai-frontline',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-frontline.html',
  styleUrls: ['./ai-frontline.scss'],
})
export class AiFrontlineComponent implements OnInit {
  private readonly i18n = inject(I18nService);

  // News data
  news = signal<AiNewsItem[]>([]);
  source = signal<AiFrontlineSource | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  // Filters
  searchQuery = signal('');
  selectedCategory = signal<string>('all');

  // Categories
  categories = ['all', 'model', 'product', 'funding', 'opensource', 'agent', 'tool', 'industry'];

  // Filtered news
  filteredNews = computed(() => {
    const category = this.selectedCategory();
    const query = this.searchQuery();

    return this.news()
      .filter((item) => isAfterContentStartDate(item.date))
      .filter((item) => {
        const matchesCategory =
          category === 'all' ||
          normalizeSearchText(item.category) === normalizeSearchText(category);

        const matchesQuery = matchesSearchQuery(this.getAiNewsSearchText(item), query);

        return matchesCategory && matchesQuery;
      });
  });

  // Group news by date
  groupedNews = computed(() => {
    const groups = new Map<string, AiNewsItem[]>();
    for (const item of this.filteredNews()) {
      const date = item.date;
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)!.push(item);
    }
    // Sort by date descending
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  });

  async ngOnInit() {
    await this.loadNews();
  }

  t(key: string): string {
    return this.i18n.t(key);
  }

  private getAiNewsSearchText(item: AiNewsItem): string {
    return buildSearchText([
      item.title,
      item.summary,
      item.category,
      this.getCategoryLabel(item.category),
      item.tags,
      item.source,
      item.date,
      item.fetchedAt,
      item.url,
      item.id,
    ]);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  clearFilters(): void {
    this.selectedCategory.set('all');
  }

  clearAll(): void {
    this.clearSearch();
    this.clearFilters();
  }

  async loadNews() {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Try to load from generated content first
      const { AI_FRONTLINE_NEWS, AI_FRONTLINE_SOURCE } =
        await import('../../../generated/content.generated');
      this.news.set(AI_FRONTLINE_NEWS);
      this.source.set(AI_FRONTLINE_SOURCE);
    } catch {
      // Fallback: load from content files directly (for development)
      try {
        const newsModule = await import('../../../content/ai-frontline/news.json');
        const sourceModule = await import('../../../content/ai-frontline/source.json');
        this.news.set(newsModule.default as AiNewsItem[]);
        this.source.set(sourceModule.default as AiFrontlineSource);
      } catch {
        this.error.set(this.i18n.t('aiFrontline.fetchError'));
        this.news.set([]);
      }
    } finally {
      this.loading.set(false);
    }
  }

  onSearchChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  onCategoryChange(category: string) {
    this.selectedCategory.set(category);
  }

  getCategoryClass(category: string): string {
    return `category-${category}`;
  }

  getCategoryLabel(category: string): string {
    const key = `aiFrontline.categories.${category}`;
    return this.i18n.t(key);
  }

  contentSinceText(): string {
    const src = this.source();
    const date = src?.contentStartDate || CONTENT_START_DATE;
    return this.i18n.t('common.contentSince').replace('{{date}}', date);
  }

  getCategoryCount(category: string): number {
    return this.news().filter(
      (item) => item.category === category && isAfterContentStartDate(item.date),
    ).length;
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return this.i18n.t('common.today');
    if (diffDays === 1) return this.i18n.t('common.yesterday');
    if (diffDays < 7) return `${diffDays}${this.i18n.t('common.daysAgo')}`;

    const locale = this.i18n.locale() === 'zh-CN' ? 'zh-CN' : 'en-US';
    return date.toLocaleDateString(locale, {
      month: 'long',
      day: 'numeric',
    });
  }

  openSource(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  trackByDate(index: number, group: [string, AiNewsItem[]]): string {
    return group[0];
  }

  trackByNews(index: number, item: AiNewsItem): string {
    return item.id;
  }
}
