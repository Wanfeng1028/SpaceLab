import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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
    return this.http.get<CommentListResponse>(`${this.apiUrl}/admin/comments`, { params });
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
