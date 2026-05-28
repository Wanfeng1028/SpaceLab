import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { I18nService } from '../../core/services/i18n.service';
import { GalleryCardComponent } from '../../shared/components/cards/gallery-card.component';
import { GALLERY } from '../../../generated/content.generated';

@Component({
  selector: 'app-gallery',
  templateUrl: './gallery.html',
  styleUrl: './gallery.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GalleryCardComponent],
})
export class GalleryComponent {
  private i18n = inject(I18nService);

  readonly selectedType = signal('all');

  readonly allItems = computed(() => GALLERY);

  readonly types = computed(() => {
    const t = new Set(this.allItems().map((i) => i.type));
    return ['all', ...Array.from(t)];
  });

  readonly filteredItems = computed(() => {
    const type = this.selectedType();
    if (type === 'all') return this.allItems();
    return this.allItems().filter((i) => i.type === type);
  });

  t(key: string): string {
    return this.i18n.t(key);
  }

  selectType(type: string): void {
    this.selectedType.set(type);
  }
}
