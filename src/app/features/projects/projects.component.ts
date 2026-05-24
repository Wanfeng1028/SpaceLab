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

  readonly allProjects: Project[] = [
    {
      title: 'SpaceLab',
      slug: 'spacelab',
      icon: '🌌',
      description: '个人数字空间网站 — 3D 粒子背景、玻璃拟态设计、文章发布系统',
      accentColor: '#1a73e8',
      stack: ['Angular 21', 'Three.js', 'GSAP', 'Supabase'],
      category: 'Web',
    },
    {
      title: 'Particle Gallery',
      slug: 'particle-gallery',
      icon: '✨',
      description: '基于 WebGL 的交互式粒子画廊，支持鼠标交互和实时渲染',
      accentColor: '#9c27b0',
      stack: ['Three.js', 'WebGL', 'GLSL'],
      category: '3D',
    },
    {
      title: 'Glass UI Kit',
      slug: 'glass-ui-kit',
      icon: '🔮',
      description: '一套完整的玻璃拟态 UI 组件库，支持主题切换和响应式',
      accentColor: '#00bcd4',
      stack: ['SCSS', 'CSS Variables', 'TypeScript'],
      category: 'UI',
    },
    {
      title: 'Task Flow',
      slug: 'task-flow',
      icon: '📋',
      description: '极简主义任务管理工具，支持拖拽排序和数据可视化',
      accentColor: '#4caf50',
      stack: ['React', 'Node.js', 'MongoDB'],
      category: 'Web',
    },
    {
      title: 'Motion Lab',
      slug: 'motion-lab',
      icon: '🧪',
      description: '动效实验集合 — 缓动曲线可视化、3D 变换、粒子系统',
      accentColor: '#ff9800',
      stack: ['GSAP', 'Three.js', 'CSS Animations'],
      category: '3D',
    },
    {
      title: 'Data Viz Toolkit',
      slug: 'data-viz',
      icon: '📊',
      description: '数据可视化工具集，包含图表组件和交互式仪表盘',
      accentColor: '#f44336',
      stack: ['D3.js', 'Canvas', 'SVG'],
      category: 'Data',
    },
  ];

  readonly categories = computed(() => {
    const cats = new Set(this.allProjects.map((p) => p.category));
    return ['all', ...Array.from(cats)];
  });

  readonly filteredProjects = computed(() => {
    const category = this.selectedCategory();
    if (category === 'all') return this.allProjects;
    return this.allProjects.filter((p) => p.category === category);
  });

  t(key: string): string {
    return this.i18n.t(key);
  }

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
  }
}
