import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { LiveCommentService, LiveComment } from '../../../core/services/live-comment.service';
import { AuthService } from '../../../core/services/auth.service';
import { LiveCommentItemComponent } from '../live-comment-item/live-comment-item.component';

@Component({
  selector: 'app-live-comment',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LiveCommentItemComponent],
  templateUrl: './live-comment.component.html',
  styleUrl: './live-comment.component.scss'
})
export class LiveCommentComponent implements OnInit, OnChanges {
  @Input() postId!: string;
  @Input() postTitle: string = '';
  @Input() pageSize: number = 10;
  @Input() enableReply: boolean = true;
  @Input() enableLike: boolean = false;

  @Output() commentCountChange = new EventEmitter<number>();

  private commentService = inject(LiveCommentService);
  private authService = inject(AuthService);

  comments: LiveComment[] = [];
  loading: boolean = false;
  error: string | null = null;
  totalComments: number = 0;
  currentPage: number = 1;

  newComment: string = '';
  submitting: boolean = false;
  replyTo: LiveComment | null = null;

  /** 当前登录用户 */
  readonly isLoggedIn = this.authService.isLoggedInSig;
  readonly currentUser = this.authService.currentUserSig;

  ngOnInit(): void {
    this.loadComments();
    this.loadCommentCount();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['postId'] && !changes['postId'].firstChange) {
      this.currentPage = 1;
      this.loadComments();
      this.loadCommentCount();
    }
  }

  loadComments(): void {
    this.loading = true;
    this.error = null;

    this.commentService.getComments(this.postId, this.currentPage, this.pageSize)
      .subscribe({
        next: (response) => {
          // 兼容原生后端格式 { comments: [], total: N } 和旧 LiveComment 格式 { list: [], total: N }
          const nativeResp = response as any;
          if (nativeResp.comments && Array.isArray(nativeResp.comments)) {
            this.comments = nativeResp.comments;
            this.totalComments = nativeResp.total ?? nativeResp.comments.length;
          } else if (nativeResp.list && Array.isArray(nativeResp.list)) {
            this.comments = nativeResp.list;
            this.totalComments = nativeResp.total ?? nativeResp.list.length;
          } else {
            this.comments = [];
            this.totalComments = 0;
          }
          this.loading = false;
        },
        error: (err) => {
          this.error = '评论加载失败，请稍后再试';
          this.loading = false;
          console.error('Error loading comments:', err);
        }
      });
  }

  loadCommentCount(): void {
    this.commentService.getCommentCount(this.postId)
      .subscribe({
        next: (response) => {
          this.totalComments = response.count;
          this.commentCountChange.emit(this.totalComments);
        },
        error: (err) => {
          console.error('Error loading comment count:', err);
        }
      });
  }

  submitComment(): void {
    if (!this.newComment.trim()) {
      return;
    }

    if (!this.isLoggedIn()) {
      this.error = '请先登录后再发表评论';
      return;
    }

    this.submitting = true;

    this.commentService.createComment(
      this.postId,
      this.newComment.trim(),
      this.replyTo?.id
    ).subscribe({
      next: () => {
        this.newComment = '';
        this.replyTo = null;
        this.submitting = false;
        this.loadComments();
        this.loadCommentCount();
      },
      error: (err) => {
        this.submitting = false;
        if (err.status === 401) {
          this.error = '请先登录后再发表评论';
        } else {
          this.error = '评论发布失败，请稍后再试';
        }
        console.error('Error submitting comment:', err);
      }
    });
  }

  cancelReply(): void {
    this.replyTo = null;
  }

  startReply(comment: LiveComment): void {
    if (!this.enableReply) {
      return;
    }
    if (!this.isLoggedIn()) {
      this.error = '请先登录后再回复评论';
      return;
    }
    this.replyTo = comment;
    setTimeout(() => {
      const input = document.querySelector('#new-comment-input') as HTMLTextAreaElement;
      if (input) {
        input.focus();
      }
    }, 100);
  }

  deleteComment(commentId: string): void {
    this.commentService.deleteComment(commentId).subscribe({
      next: () => {
        this.loadComments();
        this.loadCommentCount();
      },
      error: (err) => {
        this.error = '删除评论失败';
        console.error('Error deleting comment:', err);
      }
    });
  }

  getRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const month = 30 * day;
    const year = 365 * day;

    if (diff < minute) {
      return '刚刚';
    } else if (diff < hour) {
      return Math.floor(diff / minute) + '分钟前';
    } else if (diff < day) {
      return Math.floor(diff / hour) + '小时前';
    } else if (diff < month) {
      return Math.floor(diff / day) + '天前';
    } else if (diff < year) {
      return Math.floor(diff / month) + '个月前';
    } else {
      return Math.floor(diff / year) + '年前';
    }
  }

  hasMore(): boolean {
    return this.comments.length < this.totalComments;
  }

  loadMore(): void {
    this.currentPage++;
    this.loadComments();
  }
}
