import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LiveComment } from '../../../core/services/live-comment.service';

@Component({
  selector: 'app-live-comment-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './live-comment-item.component.html',
  styleUrl: './live-comment-item.component.scss'
})
export class LiveCommentItemComponent {
  @Input() comment!: LiveComment;
  @Input() enableReply: boolean = true;
  @Input() enableLike: boolean = false;

  @Output() replyEvent = new EventEmitter<LiveComment>();
  @Output() deleteEvent = new EventEmitter<string>();

  getRelativeTime(createdAt: string): string {
    if (!createdAt) return '';
    const timestamp = new Date(createdAt).getTime();
    if (isNaN(timestamp)) return '';
    const now = Date.now();
    const diff = now - timestamp;
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (diff < minute) return '刚刚';
    if (diff < hour) return Math.floor(diff / minute) + '分钟前';
    if (diff < day) return Math.floor(diff / hour) + '小时前';
    return Math.floor(diff / day) + '天前';
  }

  getDisplayName(): string {
    return this.comment.user?.username || '匿名用户';
  }

  getAvatarUrl(): string {
    if (this.comment.user?.avatar_url) return this.comment.user.avatar_url;
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${this.getDisplayName()}&backgroundColor=b6e3f4`;
  }

  isAdmin(): boolean {
    return this.comment.user?.role === 'admin';
  }

  startReply(): void {
    if (this.enableReply) {
      this.replyEvent.emit(this.comment);
    }
  }

  handleDelete(): void {
    this.deleteEvent.emit(this.comment.id);
  }
}
