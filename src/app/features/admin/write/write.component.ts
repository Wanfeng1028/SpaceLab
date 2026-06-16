import { Component, inject, signal, computed, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../../core/services/i18n.service';
import { PostService, Post } from '../../../core/services/post.service';
import { ContentService, Category } from '../../../core/services/content.service';
import { MarkdownRendererService } from '../../../core/services/markdown-renderer.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-write',
  templateUrl: './write.html',
  styleUrl: './write.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
})
export class WriteComponent implements OnInit, OnDestroy {
  private i18n = inject(I18nService);
  private postService = inject(PostService);
  private contentService = inject(ContentService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private markdownRenderer = inject(MarkdownRendererService);
  private sanitizer = inject(DomSanitizer);

  readonly title = signal('');
  readonly slug = signal('');
  readonly summary = signal('');
  readonly content = signal('');
  readonly coverUrl = signal('');
  readonly category = signal('');
  readonly tagsInput = signal('');
  readonly language = signal('zh-CN');
  readonly isPreview = signal(false);
  readonly isSaving = signal(false);
  readonly isPublishing = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  /** 定时发布 */
  readonly scheduledAt = signal('');

  /** 标记是否有未保存的修改 */
  readonly isDirty = signal(false);

  readonly isEditing = signal(false);
  readonly editId = signal<string | null>(null);

  /** 渲染后的 Markdown 预览 HTML */
  readonly previewHtml = signal<SafeHtml>('');

  /** 动态分类列表（从后端获取） */
  readonly categories = signal<Category[]>([]);

  /** Parse comma-separated tags into array */
  readonly tagsArray = computed(() =>
    this.tagsInput()
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
  );

  private autoSaveTimer: ReturnType<typeof setInterval> | undefined;

  ngOnInit(): void {
    this.loadCategories();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditing.set(true);
      this.editId.set(id);
      this.loadPost(id);
    }

    // 自动保存草稿（每 30 秒）
    this.autoSaveTimer = setInterval(() => {
      if (this.isDirty() && this.title() && !this.isEditing()) {
        this.autoSave();
      }
    }, 30000);

    // 离开页面提醒
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.beforeUnload);
    }
  }

  ngOnDestroy(): void {
    if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.beforeUnload);
    }
  }

  private beforeUnload = (e: BeforeUnloadEvent): void => {
    if (this.isDirty()) {
      e.preventDefault();
      e.returnValue = '';
    }
  };

  /** 标记内容已修改（供模板调用） */
  markDirty(): void {
    this.isDirty.set(true);
    this.error.set('');
    this.success.set('');
  }

  private loadCategories(): void {
    this.contentService.listCategories().subscribe({
      next: (list) => this.categories.set(list || []),
      error: () => {
        this.categories.set([
          { id: '', slug: 'GIS', name: 'GIS', description: '', icon: '', sort_order: 0, created_at: '', updated_at: '' },
          { id: '', slug: 'dev', name: '开发', description: '', icon: '', sort_order: 0, created_at: '', updated_at: '' },
          { id: '', slug: 'algorithm', name: '算法', description: '', icon: '', sort_order: 0, created_at: '', updated_at: '' },
          { id: '', slug: 'essay', name: '随笔', description: '', icon: '', sort_order: 0, created_at: '', updated_at: '' },
          { id: '', slug: 'deals', name: '薅羊毛攻略', description: '', icon: '', sort_order: 0, created_at: '', updated_at: '' },
        ]);
      },
    });
  }

  loadPost(id: string): void {
    this.postService.getPostBySlug(id).subscribe({
      next: (post) => {
        this.title.set(post.title);
        this.slug.set(post.slug);
        this.summary.set(post.summary || '');
        this.content.set(post.content);
        this.coverUrl.set(post.cover_url || '');
        this.category.set(post.category || '');
        this.tagsInput.set((post.tags ?? []).join(', '));
        this.language.set(post.language);
        this.isDirty.set(false);
        this.renderPreview();
      },
      error: (err) => {
        this.error.set('加载文章失败');
        console.error('Failed to load post:', err);
      }
    });
  }

  t(key: string): string {
    return this.i18n.t(key);
  }

  async togglePreview(): Promise<void> {
    if (this.isPreview()) {
      this.isPreview.set(false);
    } else {
      await this.renderPreview();
      this.isPreview.set(true);
    }
  }

  /** 渲染 Markdown 为 HTML */
  private async renderPreview(): Promise<void> {
    if (this.content()) {
      const html = await this.markdownRenderer.render(this.content());
      this.previewHtml.set(this.sanitizer.bypassSecurityTrustHtml(html));
    }
  }

  onTitleChange(value: string): void {
    this.title.set(value);
    this.markDirty();
    if (!this.isEditing()) {
      this.slug.set(this.generateSlug(value));
    }
  }

  onContentChange(value: string): void {
    this.content.set(value);
    this.markDirty();
  }

  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  onSaveDraft(): void {
    this.savePost('draft');
  }

  onPublish(): void {
    this.savePost('published');
  }

  /** 自动保存（静默，不显示消息） */
  private autoSave(): void {
    if (!this.title() || !this.content()) return;
    const postData = this.buildPostData('draft');
    this.postService.createPost(postData).subscribe({
      next: () => this.isDirty.set(false),
      error: () => { /* 静默失败 */ },
    });
  }

  private buildPostData(status: string): Partial<Post> {
    const data: Partial<Post> = {
      title: this.title(),
      slug: this.slug(),
      summary: this.summary(),
      content: this.content(),
      cover_url: this.coverUrl(),
      category: this.category(),
      tags: this.tagsArray(),
      language: this.language(),
    };

    // 定时发布
    const scheduled = this.scheduledAt();
    if (scheduled) {
      data.status = 'scheduled';
      data.scheduled_at = new Date(scheduled).toISOString();
    } else {
      data.status = status;
    }

    return data;
  }

  savePost(status: string): void {
    if (!this.title() || !this.content()) {
      this.error.set('标题和内容不能为空');
      return;
    }

    this.isSaving.set(true);
    this.error.set('');
    this.success.set('');

    const postData = this.buildPostData(status);
    const request = this.isEditing()
      ? this.postService.updatePost(this.editId()!, postData)
      : this.postService.createPost(postData);

    request.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isDirty.set(false);
        this.success.set(status === 'published' ? '文章已发布' : '草稿已保存');

        if (status === 'published') {
          setTimeout(() => this.router.navigate(['/admin/posts']), 1500);
        }
      },
      error: (err) => {
        this.isSaving.set(false);
        this.error.set(err.error?.error || '保存失败，请稍后重试');
        console.error('Failed to save post:', err);
      }
    });
  }

  onBack(): void {
    if (this.isDirty()) {
      if (!confirm('有未保存的修改，确定要离开吗？')) return;
    }
    this.router.navigate(['/admin/posts']);
  }
}
