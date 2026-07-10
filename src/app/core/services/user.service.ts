import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/**
 * 后台用户管理数据。后端 ListUsers 的 users 数组仅返回 4 个字段，
 * 需要更多详情时调用 getUser(id)。
 */
export interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: 'admin' | 'writer' | 'viewer';
}

export interface AdminUserDetail extends AdminUser {
  avatar_url: string;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserListResponse {
  users: AdminUser[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface UserStats {
  total_users: number;
  active_users: number;
  banned_users: number;
  recent_users: number;
}

export type UserRole = 'admin' | 'writer' | 'viewer';
export type UserStatus = 'active' | 'banned';

/* ── Mock Data ──────────────────────────────────────────────────────── */

const MOCK_USERS: UserListResponse = {
  users: [
    { id: 'u1', email: 'admin@spacelab.com', username: 'admin', role: 'admin' },
    { id: 'u2', email: 'writer@spacelab.com', username: 'writer_zhang', role: 'writer' },
    { id: 'u3', email: 'viewer@spacelab.com', username: 'viewer_li', role: 'viewer' },
    { id: 'u4', email: 'editor@spacelab.com', username: 'editor_wang', role: 'writer' },
    { id: 'u5', email: 'guest@example.com', username: 'guest_user', role: 'viewer' },
  ],
  total: 5,
  page: 1,
  page_size: 1000,
  total_pages: 1,
};

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /** 用户分页列表 */
  listUsers(page: number = 1, pageSize: number = 20): Observable<UserListResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('page_size', pageSize.toString());
    return this.http.get<UserListResponse>(`${this.apiUrl}/admin/users`, { params }).pipe(
      catchError(() => of(MOCK_USERS)),
    );
  }

  /** 用户详情（含 avatar、注册时间等） */
  getUser(id: string): Observable<AdminUserDetail> {
    return this.http.get<AdminUserDetail>(`${this.apiUrl}/admin/users/${id}`);
  }

  /** 修改用户角色 */
  updateRole(id: string, role: UserRole): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/admin/users/${id}/role`, { role });
  }

  /** 封禁 / 解封用户 */
  updateStatus(id: string, status: UserStatus): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/admin/users/${id}/status`, { status });
  }

  /** 删除用户 */
  deleteUser(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/admin/users/${id}`);
  }

  /** 重置用户密码 */
  resetPassword(id: string, password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/admin/users/${id}/reset-password`, {
      password,
    });
  }

  /** 用户统计 */
  getStats(): Observable<UserStats> {
    return this.http.get<UserStats>(`${this.apiUrl}/admin/users/stats`);
  }
}
