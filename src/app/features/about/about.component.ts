import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
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

  readonly focusAreas = [
    { icon: '🌐', title: 'Web 全栈开发', desc: 'Angular / React + Node.js 全栈应用' },
    { icon: '🎨', title: '3D 可视化', desc: 'Three.js / WebGL 交互式 3D 体验' },
    { icon: '✨', title: '动效设计', desc: 'GSAP / CSS 高性能动画与微交互' },
    { icon: '📐', title: '设计系统', desc: 'Glassmorphism / 组件库 / 设计规范' },
  ];

  readonly contacts = [
    { icon: '✉️', label: 'Email', value: 'hello@spacelab.dev', href: 'mailto:hello@spacelab.dev' },
    { icon: '🐙', label: 'GitHub', value: 'Wanfeng1028', href: 'https://github.com/Wanfeng1028' },
  ];

  t(key: string): string {
    return this.i18n.t(key);
  }
}
