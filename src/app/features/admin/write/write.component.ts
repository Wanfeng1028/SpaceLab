import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../../core/services/i18n.service';
import { PostService, Post } from '../../../core/services/post.service';

@Component({
  selector: 'app-write',
  templateUrl: './write.html',
  styleUrl: './write.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
})
export class WriteComponent implements OnInit {
  private i18n = inject(I18nService);
  private postService = inject(PostService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

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
  readonly isEditing = signal(false);
  readonly editId = signal<string | null>(null);

  /** Parse comma-separated tags into array */
  readonly tagsArray = computed(() =>
    this.tagsInput()
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
  );

  ngOnInit(): void {
    // 检查是否是编辑模式
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditing.set(true);
      this.editId.set(id);
      this.loadPost(id);
    }
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

  togglePreview(): void {
    this.isPreview.update((v) => !v);
  }

  onTitleChange(value: string): void {
    this.title.set(value);
    // 自动生成 slug
    if (!this.isEditing()) {
      this.slug.set(this.generateSlug(value));
    }
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

  savePost(status: string): void {
    if (!this.title() || !this.content()) {
      this.error.set('标题和内容不能为空');
      return;
    }

    this.isSaving.set(true);
    this.error.set('');
    this.success.set('');

    const postData: Partial<Post> = {
      title: this.title(),
      slug: this.slug(),
      summary: this.summary(),
      content: this.content(),
      cover_url: this.coverUrl(),
      category: this.category(),
      tags: this.tagsArray(),
      language: this.language(),
      status: status
    };

    const request = this.isEditing()
      ? this.postService.updatePost(this.editId()!, postData)
      : this.postService.createPost(postData);

    request.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.success.set(status === 'published' ? '文章已发布' : '草稿已保存');
        
        if (status === 'published') {
          setTimeout(() => {
            this.router.navigate(['/admin/posts']);
          }, 1500);
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
    this.router.navigate(['/admin/posts']);
  }
}
