import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { I18nService } from '../../core/services/i18n.service';
import { ProjectCardComponent } from '../../shared/components/cards/project-card.component';
import { MacTerminalModalComponent } from '../../shared/components/mac-terminal-modal/mac-terminal-modal.component';
import { SearchBoxComponent } from '../../shared/components/search-box';
import {
  buildSearchText,
  matchesSearchQuery,
  normalizeSearchText,
} from '../../core/utils/search.utils';
import { PROJECTS } from '../../../generated/content.generated';

const PAGE_SIZE = 6;

@Component({
  selector: 'app-projects',
  templateUrl: './projects.html',
  styleUrl: './projects.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProjectCardComponent, MacTerminalModalComponent, SearchBoxComponent],
})
export class ProjectsComponent {
  private i18n = inject(I18nService);

  readonly showContactModal = signal(false);
  readonly selectedFilter = signal('all');
  readonly searchQuery = signal('');
  readonly currentPage = signal(1);

  readonly allProjects = computed(() => PROJECTS);

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

  private getProjectSearchText(project: (typeof PROJECTS)[number]): string {
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
