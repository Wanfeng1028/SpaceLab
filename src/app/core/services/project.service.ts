import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** 与后端 Project 模型对应的前端接口 */
export interface Project {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  cover_url: string;
  website_url: string;
  github_url: string;
  status: string;
  language: string;
  tags: string[];
  features: string[];
  technologies: string[];
  author_id: string;
  author?: { id: string; username: string; avatar_url?: string };
  created_at: string;
  updated_at: string;
  view_count: number;
}

export interface ProjectListResponse {
  projects: Project[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  listProjects(page = 1, pageSize = 20, status?: string, language?: string): Observable<ProjectListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('page_size', pageSize.toString());

    if (status) params = params.set('status', status);
    if (language) params = params.set('language', language);

    return this.http.get<ProjectListResponse>(`${this.apiUrl}/projects`, { params });
  }

  getProjectBySlug(slug: string): Observable<Project> {
    return this.http.get<Project>(`${this.apiUrl}/projects/${slug}`);
  }

  incrementViewCount(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/projects/${id}/view`, {});
  }

  createProject(project: Partial<Project>): Observable<Project> {
    return this.http.post<Project>(`${this.apiUrl}/projects`, project);
  }

  updateProject(id: string, project: Partial<Project>): Observable<Project> {
    return this.http.put<Project>(`${this.apiUrl}/projects/${id}`, project);
  }

  deleteProject(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/projects/${id}`);
  }
}
