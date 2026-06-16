import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AiNewsItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  source_name: string;
  source_url: string;
  category: string;
  tags: string[];
  image_url: string;
  status: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AiNewsListResponse {
  news: AiNewsItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AiNewsCategoriesResponse {
  categories: string[];
}

@Injectable({ providedIn: 'root' })
export class AiNewsService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  list(page = 1, pageSize = 20, status?: string, category?: string): Observable<AiNewsListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('page_size', pageSize.toString());
    if (status) params = params.set('status', status);
    if (category) params = params.set('category', category);
    return this.http.get<AiNewsListResponse>(`${this.apiUrl}/ai-news`, { params });
  }

  getBySlug(slug: string): Observable<AiNewsItem> {
    return this.http.get<AiNewsItem>(`${this.apiUrl}/ai-news/${slug}`);
  }

  getCategories(): Observable<AiNewsCategoriesResponse> {
    return this.http.get<AiNewsCategoriesResponse>(`${this.apiUrl}/ai-news/categories`);
  }
}
