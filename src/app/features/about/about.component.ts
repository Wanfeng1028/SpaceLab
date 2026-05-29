import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
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

  readonly avatar = PROFILE.avatar;
  readonly name = PROFILE.name;
  readonly github = PROFILE.github;
  readonly email = PROFILE.email;

  readonly focusAreas = [
    { key: 'ai', icon: '🧠' },
    { key: 'gis', icon: '🌍' },
    { key: 'algorithm', icon: '📊' },
    { key: 'fullstack', icon: '💻' },
    { key: 'resource', icon: '🗄️' },
  ] as const;

  readonly spacelabModules = [
    { key: 'aiFrontline', icon: '📡' },
    { key: 'lab', icon: '🧪' },
    { key: 'projects', icon: '🚀' },
    { key: 'articles', icon: '📝' },
  ] as const;

  t(key: string): string {
    return this.i18n.t(key);
  }
}
