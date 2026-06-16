import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LiveComment {
  id: string;
  content_type?: string;
  content_id?: string;
  content: string;
  status: string;       // pending, approved, rejected, spam
  created_at: string;   // ISO 8601 from backend
  updated_at: string;
  user_id?: string;
  user?: {
    id: string;
    username: string;
    avatar_url?: string;
    role?: string;
  };
  parent_id?: string;
  replies: LiveComment[];
}

/** 原生后端评论列表响应格式 */
export interface NativeCommentListResponse {
  comments: LiveComment[];
  total: number;
}

/** 原生后端评论计数响应格式 */
export interface NativeCommentCountResponse {
  count: number;
}

/** 兼容旧 LiveComment API 的列表响应格式 */
export interface CommentListResponse {
  total: number;
  list: LiveComment[];
  pager: {
    page: number;
    page_size: number;
    total: number;
    count: number;
  };
}

export interface CommentCountResponse {
  count: number;
}

@Injectable({
  providedIn: 'root'
})
export class LiveCommentService {
  private readonly apiUrl = environment.apiUrl;
  private http = inject(HttpClient);

  /**
   * 获取文章评论列表（自研原生后端）
   * @param postId 文章 ID 或 slug
   * @param page 页码（默认 1）
   * @param pageSize 每页数量（默认 10）
   */
  getComments(postId: string, page: number = 1, pageSize: number = 10): Observable<CommentListResponse> {
    return this.http.get<CommentListResponse>(`${this.apiUrl}/posts/${postId}/comments`, {
      params: {
        page: page.toString(),
        page_size: pageSize.toString()
      }
    });
  }

  /**
   * 获取文章评论数量
   * @param postId 文章 ID 或 slug
   */
  getCommentCount(postId: string): Observable<CommentCountResponse> {
    return this.http.get<CommentCountResponse>(`${this.apiUrl}/posts/${postId}/comment-count`);
  }

  /**
   * 创建评论（需要登录）
   * @param postId 文章 ID 或 slug
   * @param content 评论内容
   * @param parentCommentId 父评论 ID（可选，用于回复）
   */
  createComment(postId: string, content: string, parentCommentId?: string, captchaToken?: string): Observable<LiveComment> {
    const body: any = {
      content: content,
      captcha_token: captchaToken || '',
    };

    if (parentCommentId) {
      body.parent_id = parentCommentId;
    }

    return this.http.post<LiveComment>(`${this.apiUrl}/posts/${postId}/comments`, body);
  }

  /**
   * 更新评论（需要登录）
   * @param commentId 评论 ID
   * @param content 新内容
   */
  updateComment(commentId: string, content: string): Observable<LiveComment> {
    return this.http.put<LiveComment>(`${this.apiUrl}/comments/${commentId}`, {
      content: content
    });
  }

  /**
   * 删除评论（需要登录）
   * @param commentId 评论 ID
   */
  deleteComment(commentId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/comments/${commentId}`);
  }

  /**
   * 审核评论（管理员）
   * @param commentId 评论 ID
   */
  approveComment(commentId: string): Observable<LiveComment> {
    return this.http.post<LiveComment>(`${this.apiUrl}/comments/${commentId}/approve`, {});
  }
}
