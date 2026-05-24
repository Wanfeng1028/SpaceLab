import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/services/i18n.service';

interface ArchiveYear {
  year: string;
  articles: { title: string; slug: string; date: string }[];
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
        { title: '你好，世界', slug: 'hello-world', date: '05-24' },
        { title: 'Angular 21 新特性速览', slug: 'angular-21-overview', date: '05-20' },
        { title: 'Three.js 粒子系统入门', slug: 'threejs-particles', date: '05-15' },
        { title: 'Glassmorphism 设计指南', slug: 'glassmorphism-guide', date: '05-10' },
        { title: '我的开发工具箱 2025', slug: 'dev-tools-2025', date: '05-05' },
      ],
    },
  ];

  t(key: string): string {
    return this.i18n.t(key);
  }
}
