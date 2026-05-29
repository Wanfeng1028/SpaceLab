import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../../../core/services/i18n.service';

@Component({
  selector: 'app-home-content-dock',
  templateUrl: './home-content-dock.component.html',
  styleUrl: './home-content-dock.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
})
export class HomeContentDockSection {
  private readonly i18n = inject(I18nService);

  readonly cards = [
    { key: 'blog', icon: '📝', route: '/blog' },
    { key: 'projects', icon: '🚀', route: '/projects' },
    { key: 'lab', icon: '🔬', route: '/lab' },
  ];

  t(key: string): string {
    return this.i18n.t(key);
  }
}
