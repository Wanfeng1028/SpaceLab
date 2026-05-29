import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../../../core/services/i18n.service';

@Component({
  selector: 'app-home-next-orbit-card',
  templateUrl: './home-next-orbit-card.component.html',
  styleUrl: './home-next-orbit-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
})
export class HomeNextOrbitCardComponent {
  private readonly i18n = inject(I18nService);

  t(key: string): string {
    return this.i18n.t('cockpit.' + key);
  }
}