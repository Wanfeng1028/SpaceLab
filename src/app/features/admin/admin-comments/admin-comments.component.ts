import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import {
  CommentService,
  AdminComment,
  CommentStatus,
} from '../../../core/services/comment.service';

type StatusFilter = CommentStatus | '';

@Component({
  selector: 'app-admin-comments',
  imports: [
    CommonModule,
    FormsModule,
    NzTableModule,
    NzButtonModule,
    NzIconModule,
    NzTagModule,
    NzTooltipModule,
    NzRadioModule,
  ],
  templateUrl: './admin-comments.html',
  styleUrl: './admin-comments.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCommentsComponent implements OnInit {
  private commentService = inject(CommentService);
  private message = inject(NzMessageService);
  private modal = inject(NzModalService);

  readonly comments = signal<AdminComment[]>([]);
  readonly loading = signal(false);
  readonly statusFilter = signal<StatusFilter>('pending');

  // 状态筛选选项
  readonly statusOptions: { label: string; value: StatusFilter }[] = [
    { label: '待审核', value: 'pending' },
    { label: '已通过', value: 'approved' },
    { label: '已拒绝', value: 'rejected' },
    { label: '全部', value: '' },
  ];

  ngOnInit(): void {
    this.loadComments();
  }

  loadComments(): void {
    this.loading.set(true);
    const status = this.statusFilter();
    this.commentService.adminList(1, 1000, status).subscribe({
      next: (response) => {
        this.comments.set(response.comments || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load comments:', err);
        this.message.error('加载评论失败');
        this.loading.set(false);
      },
    });
  }

  onStatusFilterChange(value: StatusFilter): void {
    this.statusFilter.set(value);
    this.loadComments();
  }

  /** 通过审核 */
  onApprove(comment: AdminComment): void {
    this.commentService.approve(comment.id).subscribe({
      next: () => {
        this.message.success('已通过');
        this.updateLocalStatus(comment.id, 'approved');
      },
      error: () => this.message.error('操作失败'),
    });
  }

  /** 拒绝（标记为 rejected） */
  onReject(comment: AdminComment): void {
    this.commentService.reject(comment.id).subscribe({
      next: () => {
        this.message.success('已拒绝');
        this.updateLocalStatus(comment.id, 'rejected');
      },
      error: () => this.message.error('操作失败'),
    });
  }

  /** 强制删除 */
  onDelete(comment: AdminComment): void {
    this.modal.confirm({
      nzTitle: '删除评论',
      nzContent: '确定要删除这条评论吗？此操作不可恢复。',
      nzOkText: '删除',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: '取消',
      nzOnOk: () =>
        new Promise<boolean>((resolve) => {
          this.commentService.adminDelete(comment.id).subscribe({
            next: () => {
              this.message.success('已删除');
              this.comments.update((list) =>
                list.filter((c) => c.id !== comment.id),
              );
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

  /** 本地更新状态，避免每次操作都整表刷新 */
  private updateLocalStatus(id: string, status: CommentStatus): void {
    // 当前在过滤视图下，状态变化后该评论通常应移出列表
    // —— 例如在"待审核"视图通过后，该条不再属于待审核
    const currentFilter = this.statusFilter();
    if (currentFilter === '' ) {
      // 全部视图：就地更新状态标签
      this.comments.update((list) =>
        list.map((c) => (c.id === id ? { ...c, status } : c)),
      );
    } else {
      // 过滤视图：移出列表
      this.comments.update((list) => list.filter((c) => c.id !== id));
    }
  }

  statusText(status: CommentStatus): string {
    return status === 'pending'
      ? '待审核'
      : status === 'approved'
        ? '已通过'
        : '已拒绝';
  }

  statusColor(status: CommentStatus): string {
    return status === 'pending'
      ? 'orange'
      : status === 'approved'
        ? 'green'
        : 'red';
  }

  /** 作者显示名 */
  authorName(comment: AdminComment): string {
    return comment.user?.username || comment.user?.email || `用户 ${comment.user_id.slice(0, 8)}`;
  }
}
