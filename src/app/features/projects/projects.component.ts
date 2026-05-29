import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { I18nService } from '../../core/services/i18n.service';
import { ProjectCardComponent } from '../../shared/components/cards/project-card.component';
import { MacTerminalModalComponent } from '../../shared/components/mac-terminal-modal/mac-terminal-modal.component';
import { PROJECTS } from '../../../generated/content.generated';

@Component({
  selector: 'app-projects',
  templateUrl: './projects.html',
  styleUrl: './projects.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProjectCardComponent, MacTerminalModalComponent],
})
export class ProjectsComponent {
  private i18n = inject(I18nService);

  readonly showContactModal = signal(false);
  readonly selectedFilter = signal('all');

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
    const filter = this.selectedFilter();
    if (filter === 'all') return this.allProjects();
    if (filter === 'featured') return this.allProjects().filter((p) => p.featured);
    return this.allProjects().filter(
      (p) =>
        p.tags.some((t) => t.toLowerCase() === filter.toLowerCase()) ||
        p.language.toLowerCase() === filter.toLowerCase(),
    );
  });

  readonly contactEmail = 'hello@spacelab.dev';
  readonly githubUrl = 'https://github.com/Wanfeng1028';

  t(key: string): string {
    return this.i18n.t(key);
  }

  selectFilter(tag: string): void {
    this.selectedFilter.set(tag);
  }

  formatDate(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  }
}
