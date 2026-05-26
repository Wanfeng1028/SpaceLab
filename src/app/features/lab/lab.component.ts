import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { I18nService } from '../../core/services/i18n.service';

@Component({
  selector: 'app-lab',
  templateUrl: './lab.html',
  styleUrl: './lab.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LabComponent {
  private i18n = inject(I18nService);

  private readonly experimentData = [
    { key: 'exp0', icon: '✨', tech: 'Three.js', status: 'live' as const },
    { key: 'exp1', icon: '🔮', tech: 'CSS', status: 'live' as const },
    { key: 'exp2', icon: '📈', tech: 'GSAP', status: 'coming' as const },
    { key: 'exp3', icon: '🔤', tech: 'Three.js', status: 'coming' as const },
    { key: 'exp4', icon: '🌊', tech: 'WebGL', status: 'coming' as const },
    { key: 'exp5', icon: '🎵', tech: 'Canvas', status: 'coming' as const },
  ];

  readonly experiments = computed(() =>
    this.experimentData.map((e) => ({
      title: this.i18n.t(`lab.${e.key}_title`),
      icon: e.icon,
      desc: this.i18n.t(`lab.${e.key}_desc`),
      tech: e.tech,
      status: e.status,
    }))
  );

  t(key: string): string {
    return this.i18n.t(key);
  }
}
