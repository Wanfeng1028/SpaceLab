import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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
}

export interface PostListResponse {
  posts: Post[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

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

    return this.http.get<PostListResponse>(`${this.apiUrl}/posts`, { params });
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
