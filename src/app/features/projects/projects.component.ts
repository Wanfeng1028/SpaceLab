import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { I18nService } from '../../core/services/i18n.service';
import { ProjectCardComponent } from '../../shared/components/cards/project-card.component';
import { PROJECTS } from '../../../generated/content.generated';

@Component({
  selector: 'app-projects',
  templateUrl: './projects.html',
  styleUrl: './projects.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProjectCardComponent],
})
export class ProjectsComponent {
  private i18n = inject(I18nService);

  readonly selectedCategory = signal('all');

  readonly allProjects = computed(() => PROJECTS);

  readonly categories = computed(() => {
    const cats = new Set(this.allProjects().map((p) => p.category).filter(Boolean));
    return ['all', ...Array.from(cats)];
  });

  readonly filteredProjects = computed(() => {
    const category = this.selectedCategory();
    if (category === 'all') return this.allProjects();
    return this.allProjects().filter((p) => p.category === category);
  });

  t(key: string): string {
    return this.i18n.t(key);
  }

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
  }
}
