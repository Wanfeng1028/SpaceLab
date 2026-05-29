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
import { MatButtonToggleModule } from '@angular/material/button-toggle';
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
  targetFile?: string;
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

const PAGE_SIZE = 15;

@Component({
  selector: 'app-lab',
  templateUrl: './lab.html',
  styleUrl: './lab.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatChipsModule,
    MatListModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatDialogModule,
  ],
})
export class LabComponent implements OnInit {
  private readonly i18n = inject(I18nService);
  private readonly dialog = inject(MatDialog);

  readonly tabs: { key: TabKey; labelKey: string }[] = [
    { key: 'tools', labelKey: 'lab.aiTools' },
    { key: 'projects', labelKey: 'lab.aiProjects' },
  ];

  readonly predefinedCategories: Record<TabKey, string[]> = {
    tools: ['AI工具', 'Agent', '模型', '开源', '工作流', '图像', '视频', '编程', '平台', '框架'],
    projects: [
      'AI项目和框架',
      'Agent',
      '模型',
      '开源',
      '工作流',
      '图像',
      '视频',
      '编程',
      '平台',
      '框架',
    ],
  };

  readonly sidebarDateRangeOptions: DateRangeFilter[] = ['all', 'today', 'yesterday', '7d', '30d'];

  activeTab = signal<TabKey>('tools');
  searchQuery = signal('');
  selectedCategory = signal('all');
  selectedDateRange = signal<DateRangeFilter>('all');
  loading = signal(true);
  currentPage = signal(1);

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

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.currentData().length / PAGE_SIZE)),
  );

  readonly pagedData = computed(() => {
    const start = (this.currentPage() - 1) * PAGE_SIZE;
    return this.currentData().slice(start, start + PAGE_SIZE);
  });

  readonly highlightItems = computed(() => {
    return this.currentData().slice(0, 3);
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

  categories = computed(() => {
    const tab = this.activeTab();
    const data = tab === 'tools' ? this.toolsData() : this.projectsData();
    const filtered = data.filter((item) =>
      isAfterContentStartDate(item.publishedAt || item.fetchedAt || item.date),
    );

    const predefined = this.predefinedCategories[tab];
    const dynamic = new Set<string>();
    for (const item of filtered) {
      dynamic.add(item.category);
      for (const tag of item.tags) {
        dynamic.add(tag);
      }
    }

    const merged = new Set<string>(['all', ...predefined]);
    for (const cat of dynamic) {
      merged.add(cat);
    }
    return Array.from(merged);
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

  openDialog(item: LabResourceItem) {
    this.dialog.open(ResourceDetailDialogComponent, {
      panelClass: 'spacelab-mac-dialog-panel',
      data: {
        category: item.category,
        categoryLabel: item.category,
        title: item.title,
        summary: item.summary,
        source: item.source,
        date: item.date ?? '',
        fetchedAt: item.fetchedAt,
        tags: item.tags,
        url: item.url,
        i18nPrefix: 'lab',
      } satisfies ResourceDetailData,
    });
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  onTabChange(key: TabKey) {
    this.activeTab.set(key);
    this.selectedCategory.set('all');
    this.currentPage.set(1);
  }

  onSearchChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.currentPage.set(1);
  }

  onCategoryChange(cat: string) {
    this.selectedCategory.set(cat);
    this.currentPage.set(1);
  }

  onDateRangeChange(range: DateRangeFilter) {
    this.selectedDateRange.set(range);
    this.currentPage.set(1);
  }

  clearSearch() {
    this.searchQuery.set('');
    this.currentPage.set(1);
  }

  clearFilters() {
    this.selectedCategory.set('all');
    this.selectedDateRange.set('all');
    this.currentPage.set(1);
  }

  clearAll() {
    this.searchQuery.set('');
    this.selectedCategory.set('all');
    this.selectedDateRange.set('all');
    this.currentPage.set(1);
  }

  getCategoryLabel(cat: string): string {
    if (cat === 'all') return this.t('resourceInbox.all');
    return cat;
  }

  getCategoryCount(cat: string): number {
    if (cat === 'all') {
      return this.currentData().length;
    }
    const data = this.activeTab() === 'tools' ? this.toolsData() : this.projectsData();
    const range = this.selectedDateRange();
    return data.filter(
      (item) =>
        isAfterContentStartDate(item.publishedAt || item.fetchedAt || item.date) &&
        matchesDateRange(item, range) &&
        (normalizeSearchText(item.category) === normalizeSearchText(cat) ||
          item.tags.some((tag) => normalizeSearchText(tag) === normalizeSearchText(cat))),
    ).length;
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

  dateRangeCount(range: DateRangeFilter): number {
    const data = this.activeTab() === 'tools' ? this.toolsData() : this.projectsData();
    return data.filter(
      (item) =>
        isAfterContentStartDate(item.publishedAt || item.fetchedAt || item.date) &&
        matchesDateRange(item, range),
    ).length;
  }

  contentSinceText(): string {
    const src = this.sources();
    const date = src?.contentStartDate || CONTENT_START_DATE;
    return this.t('resourceInbox.contentSince').replace('{{date}}', date);
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
