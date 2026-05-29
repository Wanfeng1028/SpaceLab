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
import { I18nService } from '../../core/services/i18n.service';
import {
  buildSearchText,
  matchesSearchQuery,
  normalizeSearchText,
} from '../../core/utils/search.utils';

export interface LabResourceItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  source: string;
  url: string;
  tags: string[];
  publishedAt: string;
  fetchedAt: string;
  date?: string;
}

export interface LabSource {
  key: string;
  name: string;
  url: string;
  targetFile: string;
}

export interface LabSources {
  sources: LabSource[];
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

function getItemDate(item: LabResourceItem): string {
  return item.date || item.publishedAt?.slice(0, 10) || item.fetchedAt?.slice(0, 10) || '';
}

function matchesDateRange(item: LabResourceItem, range: DateRangeFilter): boolean {
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

type TabKey = 'tools' | 'projects';

@Component({
  selector: 'app-lab',
  templateUrl: './lab.html',
  styleUrl: './lab.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
})
export class LabComponent implements OnInit {
  private readonly i18n = inject(I18nService);

  readonly tabs: { key: TabKey; labelKey: string }[] = [
    { key: 'tools', labelKey: 'lab.aiTools' },
    { key: 'projects', labelKey: 'lab.aiProjects' },
  ];

  activeTab = signal<TabKey>('tools');
  searchQuery = signal('');
  selectedCategory = signal('all');
  selectedDateRange = signal<DateRangeFilter>('all');
  loading = signal(true);

  toolsData = signal<LabResourceItem[]>([]);
  projectsData = signal<LabResourceItem[]>([]);
  sources = signal<LabSources | null>(null);

  currentData = computed(() => {
    const tab = this.activeTab();
    const data = tab === 'tools' ? this.toolsData() : this.projectsData();
    const category = this.selectedCategory();
    const query = this.searchQuery();
    const range = this.selectedDateRange();
    const tabLabels =
      tab === 'tools' ? ['AI工具', 'AI Tools'] : ['AI项目和框架', 'AI Projects', 'Frameworks'];

    return data
      .filter((item) => isAfterContentStartDate(item.publishedAt || item.fetchedAt || item.date))
      .filter((item) => matchesDateRange(item, range))
      .filter((item) => {
        const matchesCategory =
          category === 'all' ||
          normalizeSearchText(item.category) === normalizeSearchText(category) ||
          item.tags.some((tag) => normalizeSearchText(tag) === normalizeSearchText(category));

        const searchText = buildSearchText([
          item.title,
          item.summary,
          item.category,
          item.tags,
          item.source,
          item.url,
          item.id,
          tabLabels,
        ]);
        const matchesQuery = matchesSearchQuery(searchText, query);

        return matchesCategory && matchesQuery;
      });
  });

  categories = computed(() => {
    const data = this.activeTab() === 'tools' ? this.toolsData() : this.projectsData();
    const filtered = data.filter((item) =>
      isAfterContentStartDate(item.publishedAt || item.fetchedAt || item.date),
    );
    const cats = new Set<string>();
    for (const item of filtered) {
      cats.add(item.category);
      for (const tag of item.tags) {
        cats.add(tag);
      }
    }
    return ['all', ...Array.from(cats).sort()];
  });

  async ngOnInit() {
    await this.loadData();
  }

  t(key: string): string {
    return this.i18n.t(key);
  }

  async loadData() {
    this.loading.set(true);
    try {
      const { LAB_AI_TOOLS, LAB_AI_PROJECTS, LAB_SOURCES } =
        await import('../../../generated/content.generated');
      this.toolsData.set(LAB_AI_TOOLS);
      this.projectsData.set(LAB_AI_PROJECTS);
      this.sources.set(LAB_SOURCES);
    } catch {
      try {
        const toolsModule = await import('../../../content/lab/ai-tools.json');
        const projectsModule = await import('../../../content/lab/ai-projects.json');
        const sourceModule = await import('../../../content/lab/source.json');
        this.toolsData.set(toolsModule.default as LabResourceItem[]);
        this.projectsData.set(projectsModule.default as LabResourceItem[]);
        this.sources.set(sourceModule.default as LabSources);
      } catch {
        this.toolsData.set([]);
        this.projectsData.set([]);
      }
    } finally {
      this.loading.set(false);
    }
  }

  onTabChange(key: TabKey) {
    this.activeTab.set(key);
    this.selectedCategory.set('all');
  }

  onSearchChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  onCategoryChange(cat: string) {
    this.selectedCategory.set(cat);
  }

  onDateRangeChange(range: DateRangeFilter) {
    this.selectedDateRange.set(range);
  }

  clearSearch() {
    this.searchQuery.set('');
  }

  clearFilters() {
    this.selectedCategory.set('all');
    this.selectedDateRange.set('all');
  }

  clearAll() {
    this.searchQuery.set('');
    this.selectedCategory.set('all');
    this.selectedDateRange.set('all');
  }

  getCategoryLabel(cat: string): string {
    if (cat === 'all') return this.t('lab.allCategories');
    return cat;
  }

  readonly dateRangeOptions: DateRangeFilter[] = ['all', 'today', 'yesterday', '7d', '30d'];

  getDateRangeLabel(range: DateRangeFilter): string {
    const key = `common.dateRange.${range}`;
    const label = this.t(key);
    return label === key ? range : label;
  }

  contentSinceText(): string {
    const src = this.sources();
    const date = src?.contentStartDate || CONTENT_START_DATE;
    return this.t('common.contentSince').replace('{{date}}', date);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  }

  formatFetchTime(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  }

  openUrl(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  trackById(_index: number, item: LabResourceItem): string {
    return item.id;
  }
}
