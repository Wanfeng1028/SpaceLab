import { Component, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { I18nService } from '../../core/services/i18n.service';
import { PROFILE } from '../../../generated/content.generated';

@Component({
  selector: 'app-about',
  templateUrl: './about.html',
  styleUrl: './about.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutComponent {
  private i18n = inject(I18nService);

  readonly skills = PROFILE.skills;

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
    })),
  );

  readonly contacts = [
    ...(PROFILE.email
      ? [{ icon: '✉️', label: 'Email', value: PROFILE.email, href: `mailto:${PROFILE.email}` }]
      : []),
    ...(PROFILE.github
      ? [
          {
            icon: '🐙',
            label: 'GitHub',
            value: PROFILE.github.split('/').pop() ?? '',
            href: PROFILE.github,
          },
        ]
      : []),
  ];

  t(key: string): string {
    return this.i18n.t(key);
  }
}
