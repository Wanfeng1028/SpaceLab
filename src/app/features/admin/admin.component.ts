import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/services/i18n.service';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
})
export class AdminComponent {
  private i18n = inject(I18nService);

  readonly title = signal('');
  readonly content = signal('');
  readonly tags = signal('');
  readonly category = signal('技术');
  readonly isPreview = signal(false);

  t(key: string): string {
    return this.i18n.t(key);
  }

  togglePreview(): void {
    this.isPreview.update((v) => !v);
  }

  onSaveDraft(): void {
    // TODO: Supabase integration
  }

  onPublish(): void {
    // TODO: Supabase integration
  }
}
