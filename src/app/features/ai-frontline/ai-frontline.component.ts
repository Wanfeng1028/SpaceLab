import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { I18nService } from '../../core/services/i18n.service';
import {
  ResourceDetailDialogComponent,
  ResourceDetailData,
} from '../../shared/components/resource-detail-dialog/resource-detail-dialog.component';
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

const PAGE_SIZE = 15;

@Component({
  selector: 'app-ai-frontline',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatChipsModule,
    MatListModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule,
    MatDividerModule,
    MatDialogModule,
  ],
  templateUrl: './ai-frontline.html',
  styleUrl: './ai-frontline.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiFrontlineComponent implements OnInit {
  private readonly i18n = inject(I18nService);
  private readonly dialog = inject(MatDialog);

  readonly news = signal<AiNewsItem[]>([]);
  readonly source = signal<AiFrontlineSource | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly searchQuery = signal('');
  readonly selectedCategory = signal<string>('all');
  readonly selectedDateRange = signal<DateRangeFilter>('all');
  readonly currentPage = signal(1);

  readonly categories = [
    'all',
    'model',
    'product',
    'funding',
    'opensource',
    'agent',
    'tool',
    'industry',
  ];
  readonly sidebarDateRangeOptions: DateRangeFilter[] = ['all', 'today', 'yesterday', '7d', '30d'];

  readonly filteredNews = computed(() => {
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

        const searchText = buildSearchText([
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
        const matchesQuery = matchesSearchQuery(searchText, query);
        return matchesCategory && matchesQuery;
      });
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredNews().length / PAGE_SIZE)),
  );

  readonly pagedData = computed(() => {
    const start = (this.currentPage() - 1) * PAGE_SIZE;
    return this.filteredNews().slice(start, start + PAGE_SIZE);
  });

  readonly highlightItems = computed(() => {
    const all = this.filteredNews();
    if (all.length === 0) return [];
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const recent = all.filter((item) => {
      const d = item.date || item.fetchedAt?.slice(0, 10) || '';
      return d === todayStr || d === yesterdayStr;
    });
    return (recent.length > 0 ? recent : all).slice(0, 3);
  });

  readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);
    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  });

  async ngOnInit() {
    await this.loadNews();
  }

  t(key: string): string {
    return this.i18n.t(key);
  }

  sidebarDateLabel(range: DateRangeFilter): string {
    const map: Record<DateRangeFilter, string> = {
      all: 'resourceInbox.all',
      today: 'resourceInbox.today',
      yesterday: 'resourceInbox.yesterday',
      '7d': 'resourceInbox.last7Days',
      '30d': 'resourceInbox.last30Days',
    };
    return this.t(map[range]);
  }

  openDialog(item: AiNewsItem): void {
    this.dialog.open(ResourceDetailDialogComponent, {
      panelClass: 'spacelab-mac-dialog-panel',
      data: {
        category: item.category,
        categoryLabel: this.getCategoryLabel(item.category),
        title: item.title,
        summary: item.summary,
        source: item.source,
        date: item.date,
        fetchedAt: item.fetchedAt,
        tags: item.tags,
        url: item.url,
        i18nPrefix: 'aiFrontline',
      } satisfies ResourceDetailData,
    });
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
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
    this.searchQuery.set('');
    this.selectedCategory.set('all');
    this.selectedDateRange.set('all');
    this.currentPage.set(1);
  }

  onDateRangeChange(range: DateRangeFilter): void {
    this.selectedDateRange.set(range);
    this.currentPage.set(1);
  }

  async loadNews() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const { AI_FRONTLINE_NEWS, AI_FRONTLINE_SOURCE } =
        await import('../../../generated/content.generated');
      this.news.set(AI_FRONTLINE_NEWS);
      this.source.set(AI_FRONTLINE_SOURCE);
    } catch {
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
    return this.i18n.t('resourceInbox.contentSince').replace('{{date}}', date);
  }

  getCategoryCount(category: string): number {
    const allItems = this.news().filter((item) => isAfterContentStartDate(item.date));
    if (category === 'all') return allItems.length;
    return allItems.filter((item) => item.category === category).length;
  }

  dateRangeCount(range: DateRangeFilter): number {
    return this.news().filter(
      (item) => isAfterContentStartDate(item.date) && matchesDateRange(item, range),
    ).length;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return this.t('resourceInbox.today');
      if (diffDays === 1) return this.t('resourceInbox.yesterday');
      if (diffDays < 7) return `${diffDays}${this.t('aiFrontline.daysAgo')}`;
      const locale = this.i18n.locale() === 'zh-CN' ? 'zh-CN' : 'en-US';
      return date.toLocaleDateString(locale, { month: 'long', day: 'numeric' });
    } catch {
      return '';
    }
  }

  openSource(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  trackByNews(_index: number, item: AiNewsItem): string {
    return item.id;
  }
}
