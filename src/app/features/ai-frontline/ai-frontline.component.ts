import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
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
const PAGE_SIZE = 10;

function isAfterContentStartDate(itemDate: string | undefined): boolean {
  if (!itemDate) return true;
  return itemDate.slice(0, 10) >= CONTENT_START_DATE;
}

type DateRangeFilter = 'all' | 'today' | 'yesterday' | '7d' | '30d';

function getItemDate(item: AiNewsItem): string {
  return item.date || item.fetchedAt?.slice(0, 10) || '';
}

function matchesDateRange(item: AiNewsItem, range: DateRangeFilter): boolean {
  const date = getItemDate(item);
  if (!date) return range === 'all';
  if (!isAfterContentStartDate(date)) return false;
  if (range === 'all') return true;

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (range === 'today') return date === todayStr;
  if (range === 'yesterday') return date === yesterdayStr;

  const itemTime = new Date(`${date}T00:00:00`).getTime();
  if (range === '7d') {
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    return itemTime >= new Date(start.toISOString().slice(0, 10)).getTime();
  }
  if (range === '30d') {
    const start = new Date(today);
    start.setDate(today.getDate() - 29);
    return itemTime >= new Date(start.toISOString().slice(0, 10)).getTime();
  }
  return true;
}

@Component({
  selector: 'app-ai-frontline',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatButtonToggleModule,
  ],
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
  selectedDateRange = signal<DateRangeFilter>('all');

  // Pagination
  currentPage = signal(1);

  // Categories
  categories = ['all', 'model', 'product', 'funding', 'opensource', 'agent', 'tool', 'industry'];

  // Filtered news
  filteredNews = computed(() => {
    const category = this.selectedCategory();
    const query = this.searchQuery();
    const range = this.selectedDateRange();

    return this.news()
      .filter((item) => isAfterContentStartDate(item.date))
      .filter((item) => matchesDateRange(item, range))
      .filter((item) => {
        const matchesCategory =
          category === 'all' ||
          normalizeSearchText(item.category) === normalizeSearchText(category);

        const matchesQuery = matchesSearchQuery(this.getAiNewsSearchText(item), query);

        return matchesCategory && matchesQuery;
      });
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredNews().length / PAGE_SIZE)));

  // Paginated + grouped by date
  paginatedGroupedNews = computed(() => {
    const page = this.currentPage();
    const start = (page - 1) * PAGE_SIZE;
    const pageItems = this.filteredNews().slice(start, start + PAGE_SIZE);

    const groups = new Map<string, AiNewsItem[]>();
    for (const item of pageItems) {
      const date = item.date;
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)!.push(item);
    }
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  });

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    const range = 2;
    for (let i = Math.max(1, current - range); i <= Math.min(total, current + range); i++) {
      pages.push(i);
    }
    return pages;
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
    this.currentPage.set(1);
  }

  clearFilters(): void {
    this.selectedCategory.set('all');
    this.selectedDateRange.set('all');
    this.currentPage.set(1);
  }

  clearAll(): void {
    this.clearSearch();
    this.clearFilters();
  }

  onDateRangeChange(range: DateRangeFilter): void {
    this.selectedDateRange.set(range);
    this.currentPage.set(1);
  }

  readonly dateRangeOptions: DateRangeFilter[] = ['all', 'today', 'yesterday', '7d', '30d'];

  getDateRangeLabel(range: DateRangeFilter): string {
    const key = `common.dateRange.${range}`;
    const label = this.t(key);
    return label === key ? range : label;
  }

  goToPage(page: number): void {
    const total = this.totalPages();
    if (page >= 1 && page <= total) {
      this.currentPage.set(page);
    }
  }

  prevPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
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
    this.currentPage.set(1);
  }

  onCategoryChange(category: string) {
    this.selectedCategory.set(category);
    this.currentPage.set(1);
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
    if (diffDays === 1) return this.i18n.t('aiFrontline.yesterday');
    if (diffDays < 7) return `${diffDays}${this.i18n.t('aiFrontline.daysAgo')}`;

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
