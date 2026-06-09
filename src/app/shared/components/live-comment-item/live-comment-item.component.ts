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

  getRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diff < minute) {
      return '刚刚';
    } else if (diff < hour) {
      return Math.floor(diff / minute) + '分钟前';
    } else if (diff < day) {
      return Math.floor(diff / hour) + '小时前';
    } else {
      return Math.floor(diff / day) + '天前';
    }
  }

  getAvatarUrl(username: string): string {
    // 使用 Gravatar 或默认头像
    const email = this.comment.email || '';
    const hash = btoa(email).slice(0, 32);
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}&backgroundColor=b6e3f4`;
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
