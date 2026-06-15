import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { I18nService } from '../../core/services/i18n.service';
import { ProjectCardComponent } from '../../shared/components/cards/project-card.component';
import { MacTerminalModalComponent } from '../../shared/components/mac-terminal-modal/mac-terminal-modal.component';
import { SearchBoxComponent } from '../../shared/components/search-box';
import {
  buildSearchText,
  matchesSearchQuery,
  normalizeSearchText,
} from '../../core/utils/search.utils';
import { ProjectService, Project } from '../../core/services/project.service';
import { PROJECTS as STATIC_PROJECTS } from '../../../generated/content.generated';

const PAGE_SIZE = 6;

/** 将后端 Project 转为卡片组件需要的格式 */
interface ProjectCard {
  id: string;
  name: string;
  description: string;
  tags: string[];
  language: string;
  stars: number;
  forks: number;
  status: string;
  cover: string;
  github: string;
  demo: string;
  featured: boolean;
  archived: boolean;
  fork: boolean;
  updatedAt: string;
}

function toCard(p: Project): ProjectCard {
  return {
    id: p.slug,
    name: p.title,
    description: p.description,
    tags: p.tags ?? [],
    language: p.language ?? '',
    stars: 0,         // 后端暂未同步 stars，后续可从 GitHub API 同步
    forks: 0,
    status: p.status === 'published' ? 'Building' : p.status,
    cover: p.cover_url ?? '',
    github: p.github_url ?? '',
    demo: p.website_url ?? '',
    featured: false,  // 后端暂未支持 featured，后续加
    archived: p.status === 'archived',
    fork: false,
    updatedAt: p.updated_at,
  };
}

function staticToCard(p: typeof STATIC_PROJECTS[number]): ProjectCard {
  return { ...p };
}

@Component({
  selector: 'app-projects',
  templateUrl: './projects.html',
  styleUrl: './projects.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProjectCardComponent, MacTerminalModalComponent, SearchBoxComponent],
})
export class ProjectsComponent implements OnInit {
  private i18n = inject(I18nService);
  private projectService = inject(ProjectService);

  readonly loading = signal(false);
  readonly showContactModal = signal(false);
  readonly selectedFilter = signal('all');
  readonly searchQuery = signal('');
  readonly currentPage = signal(1);

  /** 最终展示的项目列表（优先后端数据，降级到静态数据） */
  private readonly _projects = signal<ProjectCard[]>([]);

  readonly allProjects = computed(() => this._projects());

  readonly filterTags = computed(() => {
    const tags = new Set<string>();
    for (const p of this.allProjects()) {
      for (const tag of p.tags) {
        tags.add(tag);
      }
    }
    return ['all', 'featured', ...Array.from(tags)];
  });

  readonly filteredProjects = computed(() => {
    const query = this.searchQuery();
    const filter = this.selectedFilter();

    return this.allProjects().filter((project) => {
      const matchesQuery = matchesSearchQuery(this.getProjectSearchText(project), query);

      const matchesFilter =
        filter === 'all' ||
        (filter === 'featured' && project.featured) ||
        project.tags.some((t) => normalizeSearchText(t) === normalizeSearchText(filter)) ||
        normalizeSearchText(project.language) === normalizeSearchText(filter);

      return matchesQuery && matchesFilter;
    });
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredProjects().length / PAGE_SIZE)),
  );

  readonly pagedProjects = computed(() => {
    const start = (this.currentPage() - 1) * PAGE_SIZE;
    return this.filteredProjects().slice(start, start + PAGE_SIZE);
  });

  readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  });

  ngOnInit(): void {
    this.loadProjects();
  }

  private loadProjects(): void {
    this.loading.set(true);
    this.projectService.listProjects(1, 100, 'published').subscribe({
      next: (res) => {
        this._projects.set((res.projects ?? []).map(toCard));
        this.loading.set(false);
      },
      error: () => {
        // 降级：使用静态数据
        this._projects.set(STATIC_PROJECTS.map(staticToCard));
        this.loading.set(false);
      },
    });
  }

  private getProjectSearchText(project: ProjectCard): string {
    return buildSearchText([
      project.name,
      project.description,
      project.tags,
      project.language,
      project.status,
      project.id,
      project.github,
      project.demo,
      project.updatedAt,
    ]);
  }

  readonly contactEmail = 'service.ai@outlook.com';
  readonly githubUrl = 'https://github.com/Wanfeng1028';

  t(key: string): string {
    return this.i18n.t(key);
  }

  tPage(key: string, params: Record<string, string | number>): string {
    let result = this.i18n.t(key);
    for (const [k, v] of Object.entries(params)) {
      result = result.replace(`{{${k}}}`, String(v));
    }
    return result;
  }

  selectFilter(tag: string): void {
    this.selectedFilter.set(tag);
    this.currentPage.set(1);
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  formatDate(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.currentPage.set(1);
  }

  clearFilters(): void {
    this.selectedFilter.set('all');
    this.currentPage.set(1);
  }

  clearAll(): void {
    this.searchQuery.set('');
    this.selectedFilter.set('all');
    this.currentPage.set(1);
  }
}
