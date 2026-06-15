import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { PostService, Post } from '../../../core/services/post.service';

@Component({
  selector: 'app-admin-posts',
  imports: [CommonModule, NzTableModule, NzButtonModule, NzIconModule, NzTagModule, NzTooltipModule, NzModalModule],
  templateUrl: './admin-posts.html',
  styleUrl: './admin-posts.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPostsComponent implements OnInit {
  private postService = inject(PostService);
  private router = inject(Router);
  private message = inject(NzMessageService);
  private modal = inject(NzModalService);

  readonly posts = signal<Post[]>([]);
  readonly loading = signal(false);

  ngOnInit(): void {
    this.loadPosts();
  }

  loadPosts(): void {
    this.loading.set(true);
    this.postService.getPosts(1, 1000).subscribe({
      next: (response) => {
        this.posts.set(response.posts || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load posts:', err);
        this.loading.set(false);
      },
    });
  }

  onNew(): void {
    this.router.navigate(['/admin/write']);
  }

  onEdit(id: string): void {
    this.router.navigate(['/admin/write', id]);
  }

  onPublish(post: Post): void {
    this.postService.publishPost(post.id).subscribe({
      next: () => {
        this.message.success('文章已发布');
        this.loadPosts();
      },
      error: () => this.message.error('发布失败'),
    });
  }

  onDelete(post: Post): void {
    this.modal.confirm({
      nzTitle: '删除文章',
      nzContent: `确定要删除「${post.title}」吗？此操作不可恢复。`,
      nzOkText: '删除',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: '取消',
      nzOnOk: () =>
        new Promise<boolean>((resolve) => {
          this.postService.deletePost(post.id).subscribe({
            next: () => {
              this.message.success('已删除');
              this.loadPosts();
              resolve(true);
            },
            error: () => {
              this.message.error('删除失败');
              resolve(true);
            },
          });
        }),
    });
  }

  statusText(status: string): string {
    return status === 'published' ? '已发布' : status === 'draft' ? '草稿' : status;
  }

  statusColor(status: string): string {
    return status === 'published' ? 'success' : status === 'draft' ? 'warning' : 'default';
  }
}
