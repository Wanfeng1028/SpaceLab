import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ArticleRepositoryService } from '../../../core/services/article-repository.service';
import { I18nService } from '../../../core/services/i18n.service';
import type { PublishTarget } from '../../../core/models/article.model';

@Component({
  selector: 'app-write',
  templateUrl: './write.html',
  styleUrl: './write.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
})
export class WriteComponent {
  private repository = inject(ArticleRepositoryService);
  private i18n = inject(I18nService);

  // Form fields
  readonly title = signal('');
  readonly slug = signal('');
  readonly summary = signal('');
  readonly category = signal('开发');
  readonly tagsInput = signal('');
  readonly content = signal('');
  readonly coverFile = signal<File | null>(null);
  readonly publishTarget = signal<PublishTarget>('github');

  // UI state
  readonly publishing = signal(false);
  readonly publishSuccess = signal(false);
  readonly publishError = signal<string | null>(null);

  readonly categories = ['开发', '随笔', '薅羊毛攻略', 'GIS', '算法'];

  readonly publishTargets = [
    { value: 'static' as PublishTarget, label: 'Static Draft (本地草稿)' },
    { value: 'github' as PublishTarget, label: 'GitHub (线上发布)' },
    { value: 'supabase' as PublishTarget, label: 'Supabase (预留)' },
  ];

  t(key: string): string {
    return this.i18n.t(key);
  }

  // Auto-generate slug from title
  onTitleChange(): void {
    const currentSlug = this.slug();
    if (!currentSlug || this.isSlugDerivedFromTitle()) {
      const generated = this.generateSlug(this.title());
      this.slug.set(generated);
    }
  }

  private isSlugDerivedFromTitle(): boolean {
    const expected = this.generateSlug(this.title());
    return this.slug() === expected || !this.slug();
  }

  private generateSlug(title: string): string {
    return title
      .trim()
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/\s+/g, '-') || 'untitled';
  }

  // Parse tags from comma-separated input
  get tagsArray(): string[] {
    return this.tagsInput()
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }

  set tagsArray(value: string[]) {
    this.tagsInput.set(value.join(', '));
  }

  // Handle cover file upload
  onCoverFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      this.coverFile.set(input.files[0]);
    }
  }

  // Publish article
  async onPublish(): Promise<void> {
    this.publishError.set(null);
    this.publishSuccess.set(false);

    // Validation
    if (!this.title().trim()) {
      this.publishError.set('标题不能为空');
      return;
    }
    if (!this.slug().trim()) {
      this.publishError.set('Slug 不能为空');
      return;
    }
    if (!this.content().trim()) {
      this.publishError.set('正文内容不能为空');
      return;
    }

    this.publishing.set(true);

    const result = await this.repository.publishArticle(
      {
        slug: this.slug().trim(),
        title: this.title().trim(),
        summary: this.summary().trim(),
        category: this.category(),
        tags: this.tagsArray,
        content: this.content().trim(),
        coverFile: this.coverFile() ?? null,
      },
      this.publishTarget(),
    );

    this.publishing.set(false);

    if (result.success) {
      this.publishSuccess.set(true);
      // Reset form
      this.title.set('');
      this.slug.set('');
      this.summary.set('');
      this.content.set('');
      this.tagsInput.set('');
      this.coverFile.set(null);
    } else {
      this.publishError.set(result.error ?? '发布失败');
    }
  }
}
