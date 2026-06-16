import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { LiveCommentService, LiveComment } from '../../../core/services/live-comment.service';
import { AuthService } from '../../../core/services/auth.service';
import { RecaptchaService } from '../../../core/services/recaptcha.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-live-comment',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
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
  private recaptcha = inject(RecaptchaService);
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  comments: LiveComment[] = [];
  loading: boolean = false;
  error: string | null = null;
  totalComments: number = 0;
  currentPage: number = 1;

  newComment: string = '';
  submitting: boolean = false;
  replyTo: LiveComment | null = null;
  submittedPending = false; // 刚提交需要审核的提示

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

  async submitComment(): Promise<void> {
    if (!this.newComment.trim()) return;

    if (!this.isLoggedIn()) {
      this.error = '请先登录后再发表评论';
      return;
    }

    this.submitting = true;
    this.error = null;

    const content = this.newComment.trim();
    const captchaToken = await this.recaptcha.execute('comment');

    this.commentService.createComment(
      this.postId,
      content,
      this.replyTo?.id,
      captchaToken
    ).subscribe({
      next: () => {
        this.newComment = '';
        this.replyTo = null;
        this.submitting = false;
        this.submittedPending = true;
        // 重新加载评论（不延迟显示）
        this.loadComments();
        this.loadCommentCount();
      },
      error: (err) => {
        this.submitting = false;
        // 失败不清空输入框
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
    if (!this.enableReply) return;
    if (!this.isLoggedIn()) {
      this.error = '请先登录后再回复评论';
      return;
    }
    this.replyTo = comment;
    setTimeout(() => {
      const input = document.querySelector('#new-comment-input') as HTMLTextAreaElement;
      if (input) input.focus();
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

  reportComment(commentId: string): void {
    const reason = prompt('举报原因：spam(垃圾广告) / harassment(人身攻击) / inappropriate(内容不当) / other(其他)');
    if (!reason || !['spam', 'harassment', 'inappropriate', 'other'].includes(reason)) return;
    this.http.post(`${this.apiUrl}/comments/${commentId}/report`, { reason }).subscribe({
      next: () => { this.error = '举报已提交，我们会尽快处理'; setTimeout(() => this.error = null, 3000); },
      error: () => { this.error = '举报提交失败'; },
    });
  }

  /** 从 ISO 字符串计算相对时间 */
  getRelativeTime(createdAt: string): string {
    if (!createdAt) return '';
    const timestamp = new Date(createdAt).getTime();
    if (isNaN(timestamp)) return '';
    const now = Date.now();
    const diff = now - timestamp;

    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const month = 30 * day;
    const year = 365 * day;

    if (diff < minute) return '刚刚';
    if (diff < hour) return Math.floor(diff / minute) + '分钟前';
    if (diff < day) return Math.floor(diff / hour) + '小时前';
    if (diff < month) return Math.floor(diff / day) + '天前';
    if (diff < year) return Math.floor(diff / month) + '个月前';
    return Math.floor(diff / year) + '年前';
  }

  /** 获取用户显示名 */
  getDisplayName(comment: LiveComment): string {
    return comment.user?.username || '匿名用户';
  }

  /** 获取头像 URL */
  getAvatarUrl(comment: LiveComment): string {
    if (comment.user?.avatar_url) return comment.user.avatar_url;
    const seed = comment.user?.username || 'user';
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4`;
  }

  /** 是否为管理员 */
  isAdmin(comment: LiveComment): boolean {
    return comment.user?.role === 'admin';
  }

  /** 评论是否由当前用户发布 */
  isOwnComment(comment: LiveComment): boolean {
    const cu = this.currentUser();
    return !!cu && comment.user_id === cu.id;
  }

  hasMore(): boolean {
    return this.comments.length < this.totalComments;
  }

  loadMore(): void {
    this.currentPage++;
    this.loadComments();
  }
}
