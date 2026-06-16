import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/services/i18n.service';
import { PostService, Post } from '../../core/services/post.service';

interface ArchiveArticle {
  title: string;
  slug: string;
  date: string;
  published_at: string;
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
export class ArchiveComponent implements OnInit {
  private i18n = inject(I18nService);
  private postService = inject(PostService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly archiveData = signal<ArchiveYear[]>([]);

  ngOnInit(): void {
    this.loadArchive();
  }

  private loadArchive(): void {
    this.loading.set(true);
    this.postService.getPosts(1, 200, 'published').subscribe({
      next: (res) => {
        const posts = res.posts ?? [];
        const grouped = this.groupByYear(posts);
        this.archiveData.set(grouped);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('加载归档失败');
        this.loading.set(false);
      },
    });
  }

  private groupByYear(posts: Post[]): ArchiveYear[] {
    const map = new Map<string, ArchiveArticle[]>();
    for (const p of posts) {
      const dateStr = p.published_at ?? p.created_at;
      const d = new Date(dateStr);
      const year = d.getFullYear().toString();
      const mmdd = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push({
        title: p.title,
        slug: p.slug,
        date: mmdd,
        published_at: p.published_at ?? p.created_at,
      });
    }
    // Sort years descending, articles by date descending within each year
    return Array.from(map.entries())
      .map(([year, articles]) => ({
        year,
        articles: articles.sort((a, b) => b.published_at.localeCompare(a.published_at)),
      }))
      .sort((a, b) => b.year.localeCompare(a.year));
  }

  t(key: string): string {
    return this.i18n.t(key);
  }
}
