import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { I18nService } from '../../core/services/i18n.service';
import { ProjectCardComponent } from '../../shared/components/cards/project-card.component';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';

interface Project {
  title: string;
  slug: string;
  icon: string;
  description: string;
  accentColor: string;
  stack: string[];
  category: string;
}

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

  private readonly projectData = [
    { key: 'proj0', slug: 'spacelab', icon: '🌌', accentColor: '#1a73e8', stack: ['Angular 21', 'Three.js', 'GSAP', 'Supabase'], category: 'Web' },
    { key: 'proj1', slug: 'particle-gallery', icon: '✨', accentColor: '#9c27b0', stack: ['Three.js', 'WebGL', 'GLSL'], category: '3D' },
    { key: 'proj2', slug: 'glass-ui-kit', icon: '🔮', accentColor: '#00bcd4', stack: ['SCSS', 'CSS Variables', 'TypeScript'], category: 'UI' },
    { key: 'proj3', slug: 'task-flow', icon: '📋', accentColor: '#4caf50', stack: ['React', 'Node.js', 'MongoDB'], category: 'Web' },
    { key: 'proj4', slug: 'motion-lab', icon: '🧪', accentColor: '#ff9800', stack: ['GSAP', 'Three.js', 'CSS Animations'], category: '3D' },
    { key: 'proj5', slug: 'data-viz', icon: '📊', accentColor: '#f44336', stack: ['D3.js', 'Canvas', 'SVG'], category: 'Data' },
  ];

  readonly allProjects = computed<Project[]>(() =>
    this.projectData.map((p) => ({
      title: p.slug === 'spacelab' ? 'SpaceLab' : p.slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      slug: p.slug,
      icon: p.icon,
      description: this.i18n.t(`projects.${p.key}_desc`),
      accentColor: p.accentColor,
      stack: p.stack,
      category: p.category,
    }))
  );

  readonly categories = computed(() => {
    const cats = new Set(this.allProjects().map((p) => p.category));
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
