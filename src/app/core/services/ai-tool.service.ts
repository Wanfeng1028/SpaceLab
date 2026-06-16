import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AiTool {
  id: string;
  title: string;
  summary: string;
  category: string;
  source: string;
  url: string;
  tags: string[];
  published_at: string;
  fetched_at: string;
  created_at: string;
  updated_at: string;
}

export interface AiToolListResponse {
  tools: AiTool[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AiToolCategoriesResponse {
  categories: string[];
}

@Injectable({ providedIn: 'root' })
export class AiToolService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  list(page = 1, pageSize = 60, category?: string, search?: string): Observable<AiToolListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('page_size', pageSize.toString());
    if (category) params = params.set('category', category);
    if (search) params = params.set('search', search);
    return this.http.get<AiToolListResponse>(`${this.apiUrl}/ai-tools`, { params });
  }

  getCategories(): Observable<AiToolCategoriesResponse> {
    return this.http.get<AiToolCategoriesResponse>(`${this.apiUrl}/ai-tools/categories`);
  }
}
