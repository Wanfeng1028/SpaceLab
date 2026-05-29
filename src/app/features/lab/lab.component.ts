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
  notice: string;
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
  loading = signal(true);

  toolsData = signal<LabResourceItem[]>([]);
  projectsData = signal<LabResourceItem[]>([]);
  sources = signal<LabSources | null>(null);

  currentData = computed(() => {
    const tab = this.activeTab();
    const data = tab === 'tools' ? this.toolsData() : this.projectsData();
    const category = this.selectedCategory();
    const query = this.searchQuery();
    const tabLabels =
      tab === 'tools'
        ? ['AI工具', 'AI Tools']
        : ['AI项目和框架', 'AI Projects', 'Frameworks'];

    return data.filter((item) => {
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
    const cats = new Set<string>();
    for (const item of data) {
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

  clearSearch() {
    this.searchQuery.set('');
  }

  clearFilters() {
    this.selectedCategory.set('all');
  }

  clearAll() {
    this.searchQuery.set('');
    this.selectedCategory.set('all');
  }

  getCategoryLabel(cat: string): string {
    if (cat === 'all') return this.t('lab.allCategories');
    return cat;
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
