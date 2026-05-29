import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../../../core/services/i18n.service';

@Component({
  selector: 'app-home-resource-dock',
  templateUrl: './home-resource-dock.component.html',
  styleUrl: './home-resource-dock.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
})
export class HomeResourceDockSection {
  private readonly i18n = inject(I18nService);

  readonly cards = [
    { key: 'aiFrontline', icon: '🛰️', route: '/ai-frontline' },
    { key: 'lab', icon: '🧪', route: '/lab' },
  ];

  t(key: string): string {
    return this.i18n.t(key);
  }
}
