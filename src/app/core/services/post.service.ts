import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface PostAuthor {
  id: string;
  username: string;
  avatar_url?: string;
}

export interface Post {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  content: string;
  cover_url?: string;
  category?: string;
  tags?: string[];
  reading_time: number;
  status: string;
  language: string;
  author_id: string;
  author?: PostAuthor;
  created_at: string;
  updated_at: string;
  published_at?: string;
  view_count?: number;
  scheduled_at?: string;
}

export interface PostListResponse {
  posts: Post[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/* ── Mock Data ──────────────────────────────────────────────────────── */

const MOCK_POSTS: PostListResponse = {
  posts: [
    { id: 'p1', slug: 'angular-signals-guide', title: 'Angular 信号 Signals 完全指南', summary: '深入理解 Angular Signals 响应式编程模型', content: '# Angular Signals', status: 'published', language: 'zh', author_id: 'u1', author: { id: 'u1', username: 'admin' }, reading_time: 8, category: 'dev', tags: ['angular', 'signals'], view_count: 1234, created_at: '2026-06-15T10:00:00Z', updated_at: '2026-06-15T10:00:00Z', published_at: '2026-06-15T10:00:00Z' },
    { id: 'p2', slug: 'threejs-shader-intro', title: 'Three.js 着色器入门实战', summary: '从零开始学习 GLSL 着色器', content: '# Three.js Shaders', status: 'published', language: 'zh', author_id: 'u1', author: { id: 'u1', username: 'admin' }, reading_time: 12, category: 'dev', tags: ['three.js', 'webgl'], view_count: 987, created_at: '2026-06-20T08:00:00Z', updated_at: '2026-06-20T08:00:00Z', published_at: '2026-06-20T08:00:00Z' },
    { id: 'p3', slug: 'go-gin-rest-api', title: 'Go + Gin 构建 REST API 实战', summary: '使用 Go 和 Gin 框架构建高性能 RESTful API', content: '# Go Gin API', status: 'published', language: 'zh', author_id: 'u1', author: { id: 'u1', username: 'admin' }, reading_time: 15, category: 'dev', tags: ['go', 'gin'], view_count: 756, created_at: '2026-06-25T14:00:00Z', updated_at: '2026-06-25T14:00:00Z', published_at: '2026-06-25T14:00:00Z' },
    { id: 'p4', slug: 'css-grid-advanced', title: 'CSS Grid 高级布局技巧', summary: '掌握 CSS Grid 的高级用法和最佳实践', content: '# CSS Grid', status: 'draft', language: 'zh', author_id: 'u1', author: { id: 'u1', username: 'admin' }, reading_time: 6, category: 'dev', tags: ['css', 'layout'], view_count: 0, created_at: '2026-07-01T09:00:00Z', updated_at: '2026-07-01T09:00:00Z' },
    { id: 'p5', slug: 'llm-app-dev', title: '大语言模型应用开发初探', summary: '探索 LLM 应用开发的基本方法', content: '# LLM App Dev', status: 'draft', language: 'zh', author_id: 'u1', author: { id: 'u1', username: 'admin' }, reading_time: 10, category: 'ai', tags: ['llm', 'ai'], view_count: 0, created_at: '2026-07-05T11:00:00Z', updated_at: '2026-07-05T11:00:00Z' },
  ],
  total: 5,
  page: 1,
  page_size: 1000,
  total_pages: 1,
};

@Injectable({ providedIn: 'root' })
export class PostService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getPosts(page: number = 1, pageSize: number = 10, status?: string, language?: string, category?: string): Observable<PostListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('page_size', pageSize.toString());

    if (status) {
      params = params.set('status', status);
    }
    if (language) {
      params = params.set('language', language);
    }
    if (category) {
      params = params.set('category', category);
    }

    return this.http.get<PostListResponse>(`${this.apiUrl}/posts`, { params }).pipe(
      catchError(() => of(MOCK_POSTS)),
    );
  }

  getPostBySlug(slug: string): Observable<Post> {
    return this.http.get<Post>(`${this.apiUrl}/posts/${slug}`);
  }

  createPost(post: Partial<Post>): Observable<Post> {
    return this.http.post<Post>(`${this.apiUrl}/posts`, post);
  }

  updatePost(id: string, post: Partial<Post>): Observable<Post> {
    return this.http.put<Post>(`${this.apiUrl}/posts/${id}`, post);
  }

  deletePost(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/posts/${id}`);
  }

  publishPost(id: string): Observable<Post> {
    return this.http.post<Post>(`${this.apiUrl}/posts/${id}/publish`, {});
  }

  incrementViewCount(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/posts/${id}/view`, {});
  }
}
