import { Component, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { I18nService } from '../../core/services/i18n.service';

@Component({
  selector: 'app-about',
  templateUrl: './about.html',
  styleUrl: './about.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutComponent {
  private i18n = inject(I18nService);

  readonly skills = [
    'Angular', 'TypeScript', 'Three.js', 'GSAP', 'SCSS',
    'Node.js', 'React', 'WebGL', 'Canvas', 'Figma',
    'Git', 'Docker', 'Supabase', 'PostgreSQL',
  ];

  private readonly areaData = [
    { key: 'area0', icon: '🌐', tags: ['Angular / React', 'Node.js'] },
    { key: 'area1', icon: '🎨', tags: ['Three.js', 'WebGL'] },
    { key: 'area2', icon: '✨', tags: ['GSAP', 'CSS'] },
    { key: 'area3', icon: '📐', tags: ['Glassmorphism', '组件库'] },
  ];

  readonly focusAreas = computed(() =>
    this.areaData.map((a) => ({
      title: this.i18n.t(`about.${a.key}_title`),
      desc: this.i18n.t(`about.${a.key}_desc`),
      icon: a.icon,
      tags: a.tags,
    }))
  );

  readonly contacts = [
    { icon: '✉️', label: 'Email', value: 'hello@spacelab.dev', href: 'mailto:hello@spacelab.dev' },
    { icon: '🐙', label: 'GitHub', value: 'Wanfeng1028', href: 'https://github.com/Wanfeng1028' },
  ];

  t(key: string): string {
    return this.i18n.t(key);
  }
}
