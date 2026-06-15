import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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

@Injectable({ providedIn: 'root' })
export class ContentService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // ── Category ──

  listCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/categories`);
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
    return this.http.get<Tag[]>(`${this.apiUrl}/tags`);
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
    return this.http.get<FriendLink[]>(`${this.apiUrl}/friend-links`, { params });
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
