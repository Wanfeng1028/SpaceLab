import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

import { LiveCommentService, LiveComment } from '../../../core/services/live-comment.service';
import { LiveCommentItemComponent } from '../live-comment-item/live-comment-item.component';

@Component({
  selector: 'app-live-comment',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, LiveCommentItemComponent],
  templateUrl: './live-comment.component.html',
  styleUrl: './live-comment.component.scss'
})
export class LiveCommentComponent implements OnInit, OnChanges {
  @Input() postId!: string;
  @Input() postTitle: string = '';
  @Input() siteId: string = '';
  @Input() pageSize: number = 10;
  @Input() enableReply: boolean = true;
  @Input() enableLike: boolean = false;

  @Output() commentCountChange = new EventEmitter<number>();

  comments: LiveComment[] = [];
  loading: boolean = false;
  error: string | null = null;
  totalComments: number = 0;
  currentPage: number = 1;

  newComment: string = '';
  submitting: boolean = false;
  replyTo: LiveComment | null = null;

  constructor(
    private commentService: LiveCommentService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    if (!this.siteId) {
      this.error = 'LiveComment site ID is required';
      return;
    }
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
          this.comments = response.list;
          this.totalComments = response.total;
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Failed to load comments';
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
        this.error = 'Failed to submit comment';
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
    this.replyTo = comment;
    // 滚动到评论输入框
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
        this.error = 'Failed to delete comment';
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
