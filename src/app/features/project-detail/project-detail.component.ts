import { Component, inject } from '@angular/core';
import { I18nService } from '../../core/services/i18n.service';

@Component({
  selector: 'app-project-detail',
  template: `
    <div class="container section">
      <h1>{{ t('projectDetail.title') }}</h1>
      <p>{{ t('projectDetail.comingSoon') }}</p>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class ProjectDetailComponent {
  private i18n = inject(I18nService);

  t(key: string): string {
    return this.i18n.t(key);
  }
}
