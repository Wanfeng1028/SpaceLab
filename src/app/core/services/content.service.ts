import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ── Category ──

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  sort_order: number;
  parent_id?: string | null;
  parent?: Category;
  children?: Category[];
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryInput {
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  sort_order?: number;
  parent_id?: string;
}

export interface UpdateCategoryInput {
  slug?: string;
  name?: string;
  description?: string;
  icon?: string;
  sort_order?: number;
  parent_id?: string;
}

// ── Tag ──

export interface Tag {
  id: string;
  slug: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTagInput {
  slug: string;
  name: string;
  color?: string;
}

export interface UpdateTagInput {
  slug?: string;
  name?: string;
  color?: string;
}

// ── FriendLink ──

export interface FriendLink {
  id: string;
  name: string;
  url: string;
  logo_url: string;
  description: string;
  sort_order: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface CreateFriendLinkInput {
  name: string;
  url: string;
  logo_url?: string;
  description?: string;
  sort_order?: number;
  status?: string;
}

export interface UpdateFriendLinkInput {
  name?: string;
  url?: string;
  logo_url?: string;
  description?: string;
  sort_order?: number;
  status?: string;
}

/* ── Mock Data ──────────────────────────────────────────────────────── */

const MOCK_CATEGORIES: Category[] = [
  { id: 'cat1', slug: 'dev', name: '开发', description: '软件开发相关', icon: '💻', sort_order: 1, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 'cat2', slug: 'gis', name: 'GIS', description: '地理信息系统', icon: '🌍', sort_order: 2, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 'cat3', slug: 'ai', name: 'AI', description: '人工智能与大模型', icon: '🤖', sort_order: 3, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 'cat4', slug: 'algorithm', name: '算法', description: '算法与数据结构', icon: '🧮', sort_order: 4, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 'cat5', slug: 'essay', name: '随笔', description: '个人随笔与思考', icon: '✏️', sort_order: 5, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
];

const MOCK_TAGS: Tag[] = [
  { id: 't1', slug: 'angular', name: 'Angular', color: '#dd0031', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 't2', slug: 'three-js', name: 'Three.js', color: '#049ef4', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 't3', slug: 'go', name: 'Go', color: '#00add8', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 't4', slug: 'css', name: 'CSS', color: '#264de4', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 't5', slug: 'llm', name: 'LLM', color: '#7c3aed', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 't6', slug: 'webgl', name: 'WebGL', color: '#990000', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 't7', slug: 'signals', name: 'Signals', color: '#e11d48', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 't8', slug: 'gin', name: 'Gin', color: '#0a66c2', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
];

const MOCK_FRIEND_LINKS: FriendLink[] = [
  { id: 'fl1', name: 'Angular 官方文档', url: 'https://angular.dev', logo_url: '', description: 'Angular 框架官方文档', sort_order: 1, status: 'active', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 'fl2', name: 'Three.js 之旅', url: 'https://threejs-journey.com', logo_url: '', description: 'Three.js 学习资源', sort_order: 2, status: 'active', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 'fl3', name: 'Go 官方博客', url: 'https://go.dev/blog', logo_url: '', description: 'Go 语言官方博客', sort_order: 3, status: 'active', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 'fl4', name: '技术小站', url: 'https://example.com', logo_url: '', description: '已下线', sort_order: 4, status: 'inactive', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
];

@Injectable({ providedIn: 'root' })
export class ContentService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // ── Category ──

  listCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/categories`).pipe(
      catchError(() => of(MOCK_CATEGORIES)),
    );
  }

  getCategoryTree(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/categories/tree`);
  }

  getCategoryBySlug(slug: string): Observable<Category> {
    return this.http.get<Category>(`${this.apiUrl}/categories/${slug}`);
  }

  createCategory(input: CreateCategoryInput): Observable<Category> {
    return this.http.post<Category>(`${this.apiUrl}/categories`, input);
  }

  updateCategory(id: string, input: UpdateCategoryInput): Observable<Category> {
    return this.http.put<Category>(`${this.apiUrl}/categories/${id}`, input);
  }

  deleteCategory(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/categories/${id}`);
  }

  // ── Tag ──

  listTags(): Observable<Tag[]> {
    return this.http.get<Tag[]>(`${this.apiUrl}/tags`).pipe(
      catchError(() => of(MOCK_TAGS)),
    );
  }

  getTagBySlug(slug: string): Observable<Tag> {
    return this.http.get<Tag>(`${this.apiUrl}/tags/${slug}`);
  }

  createTag(input: CreateTagInput): Observable<Tag> {
    return this.http.post<Tag>(`${this.apiUrl}/tags`, input);
  }

  updateTag(id: string, input: UpdateTagInput): Observable<Tag> {
    return this.http.put<Tag>(`${this.apiUrl}/tags/${id}`, input);
  }

  deleteTag(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/tags/${id}`);
  }

  // ── FriendLink ──

  listFriendLinks(status?: string): Observable<FriendLink[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<FriendLink[]>(`${this.apiUrl}/friend-links`, { params }).pipe(
      catchError(() => of(MOCK_FRIEND_LINKS)),
    );
  }

  getFriendLink(id: string): Observable<FriendLink> {
    return this.http.get<FriendLink>(`${this.apiUrl}/friend-links/${id}`);
  }

  createFriendLink(input: CreateFriendLinkInput): Observable<FriendLink> {
    return this.http.post<FriendLink>(`${this.apiUrl}/friend-links`, input);
  }

  updateFriendLink(id: string, input: UpdateFriendLinkInput): Observable<FriendLink> {
    return this.http.put<FriendLink>(`${this.apiUrl}/friend-links/${id}`, input);
  }

  deleteFriendLink(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/friend-links/${id}`);
  }
}
