import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/services/i18n.service';

interface ArchiveArticle {
  titleKey: string;
  slug: string;
  date: string;
}

interface ArchiveYear {
  year: string;
  articles: ArchiveArticle[];
}

@Component({
  selector: 'app-archive',
  templateUrl: './archive.html',
  styleUrl: './archive.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
})
export class ArchiveComponent {
  private i18n = inject(I18nService);

  readonly archiveData: ArchiveYear[] = [
    {
      year: '2025',
      articles: [
        { titleKey: 'archive.post0_title', slug: 'hello-world', date: '05-24' },
        { titleKey: 'archive.post1_title', slug: 'angular-21-overview', date: '05-20' },
        { titleKey: 'archive.post2_title', slug: 'threejs-particles', date: '05-15' },
        { titleKey: 'archive.post3_title', slug: 'glassmorphism-guide', date: '05-10' },
        { titleKey: 'archive.post4_title', slug: 'dev-tools-2025', date: '05-05' },
      ],
    },
  ];

  t(key: string): string {
    return this.i18n.t(key);
  }
}
