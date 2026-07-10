import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export type CommentStatus = 'pending' | 'approved' | 'rejected';

export interface CommentAuthor {
  id: string;
  username: string;
  email: string;
}

export interface AdminComment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  status: CommentStatus;
  created_at: string;
  updated_at: string;
  user?: CommentAuthor;
}

export interface CommentListResponse {
  comments: AdminComment[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/* ── Mock Data ──────────────────────────────────────────────────────── */

const MOCK_COMMENTS: CommentListResponse = {
  comments: [
    { id: 'c1', post_id: 'p1', user_id: 'u2', parent_id: null, content: '写得非常清晰，Signals 的部分讲得很好！', status: 'approved', created_at: '2026-06-16T09:30:00Z', updated_at: '2026-06-16T09:30:00Z', user: { id: 'u2', username: 'writer_zhang', email: 'writer@spacelab.com' } },
    { id: 'c2', post_id: 'p1', user_id: 'u3', parent_id: 'c1', content: '同意，期待后续更新', status: 'approved', created_at: '2026-06-16T14:20:00Z', updated_at: '2026-06-16T14:20:00Z', user: { id: 'u3', username: 'viewer_li', email: 'viewer@spacelab.com' } },
    { id: 'c3', post_id: 'p2', user_id: 'u4', parent_id: null, content: 'Three.js 着色器这块终于有人讲明白了', status: 'pending', created_at: '2026-06-21T11:00:00Z', updated_at: '2026-06-21T11:00:00Z', user: { id: 'u4', username: 'editor_wang', email: 'editor@spacelab.com' } },
    { id: 'c4', post_id: 'p3', user_id: 'u5', parent_id: null, content: 'Gin 框架的路由设计确实很优雅', status: 'pending', created_at: '2026-06-26T16:45:00Z', updated_at: '2026-06-26T16:45:00Z', user: { id: 'u5', username: 'guest_user', email: 'guest@example.com' } },
    { id: 'c5', post_id: 'p2', user_id: 'u3', parent_id: null, content: '请问有 demo 仓库吗？', status: 'rejected', created_at: '2026-06-22T08:15:00Z', updated_at: '2026-06-22T08:15:00Z', user: { id: 'u3', username: 'viewer_li', email: 'viewer@spacelab.com' } },
  ],
  total: 5,
  page: 1,
  page_size: 1000,
  total_pages: 1,
};

@Injectable({ providedIn: 'root' })
export class CommentService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /** 后台评论分页列表，status 为空则返回所有状态 */
  adminList(page: number = 1, pageSize: number = 20, status?: CommentStatus | ''): Observable<CommentListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('page_size', pageSize.toString());
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<CommentListResponse>(`${this.apiUrl}/admin/comments`, { params }).pipe(
      catchError(() => of(MOCK_COMMENTS)),
    );
  }

  approve(id: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/admin/comments/${id}/approve`, {});
  }

  reject(id: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/admin/comments/${id}/reject`, {});
  }

  /** 管理员强制删除评论 */
  adminDelete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/admin/comments/${id}`);
  }
}
