import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../../../core/services/i18n.service';

@Component({
  selector: 'app-home-orbit-dock',
  templateUrl: './home-orbit-dock.component.html',
  styleUrl: './home-orbit-dock.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
})
export class HomeOrbitDockSection {
  private readonly i18n = inject(I18nService);

  readonly links = [
    { key: 'blog', icon: '📝', route: '/blog' },
    { key: 'projects', icon: '🚀', route: '/projects' },
    { key: 'lab', icon: '🔬', route: '/lab' },
    { key: 'aiFrontline', icon: '🛰️', route: '/ai-frontline' },
    { key: 'about', icon: '👤', route: '/about' },
  ];

  t(key: string): string {
    return this.i18n.t(key);
  }
}
