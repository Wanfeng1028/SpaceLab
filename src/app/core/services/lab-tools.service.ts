import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError, shareReplay, catchError, map } from 'rxjs';

export interface LabResourceItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  source: string;
  url: string;
  tags: string[];
  publishedAt: string;
  fetchedAt: string;
  date?: string;
  _page?: number;
}

export interface LabToolsMeta {
  total: number;
  pageSize: number;
  pages: number;
  updatedAt: string;
}

export interface LabToolsSearchIndexItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  url: string;
  source: string;
  date?: string;
  page: number;
}

@Injectable({
  providedIn: 'root',
})
export class LabToolsService {
  private readonly baseUrl = 'content/lab/ai-tools';
  private metaCache: LabToolsMeta | null = null;
  private pageCache = new Map<number, LabResourceItem[]>();
  private searchIndexCache: LabToolsSearchIndexItem[] | null = null;

  constructor(private http: HttpClient) {}

  getMeta(): Observable<LabToolsMeta> {
    if (this.metaCache) {
      return of(this.metaCache);
    }

    return this.http.get<LabToolsMeta>(`${this.baseUrl}/index.json`).pipe(
      catchError((error) => {
        console.error('Failed to load lab tools meta:', error);
        return throwError(() => error);
      }),
      map((meta) => {
        this.metaCache = meta;
        return meta;
      }),
      shareReplay(1),
    );
  }

  getPage(page: number): Observable<LabResourceItem[]> {
    if (this.pageCache.has(page)) {
      return of(this.pageCache.get(page)!);
    }

    return this.http.get<LabResourceItem[]>(`${this.baseUrl}/page-${page}.json`).pipe(
      catchError((error) => {
        console.error(`Failed to load lab tools page ${page}:`, error);
        return of([]);
      }),
      map((items) => {
        this.pageCache.set(page, items);
        return items;
      }),
      shareReplay(1),
    );
  }

  getSearchIndex(): Observable<LabToolsSearchIndexItem[]> {
    if (this.searchIndexCache) {
      return of(this.searchIndexCache);
    }

    return this.http.get<LabToolsSearchIndexItem[]>(`${this.baseUrl}/search-index.json`).pipe(
      catchError((error) => {
        console.error('Failed to load lab tools search index:', error);
        return of([]);
      }),
      map((items) => {
        this.searchIndexCache = items;
        return items;
      }),
      shareReplay(1),
    );
  }

  search(query: string): Observable<LabToolsSearchIndexItem[]> {
    return this.getSearchIndex().pipe(
      map((index) => {
        if (!query.trim()) {
          return [];
        }

        const lowerQuery = query.toLowerCase();
        return index.filter(
          (item) =>
            item.title.toLowerCase().includes(lowerQuery) ||
            item.summary.toLowerCase().includes(lowerQuery) ||
            item.category.toLowerCase().includes(lowerQuery) ||
            item.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)),
        );
      }),
    );
  }

  getItemById(id: string, page: number): Observable<LabResourceItem | null> {
    return this.getPage(page).pipe(
      map((items) => items.find((item) => item.id === id) || null),
      catchError(() => of(null)),
    );
  }

  clearCache(): void {
    this.metaCache = null;
    this.pageCache.clear();
    this.searchIndexCache = null;
  }
}
