import { Injectable, signal } from '@angular/core';
import type { Post } from '../models';
import { POSTS, type GeneratedPost } from '../../../generated/content.generated';

@Injectable({ providedIn: 'root' })
export class PostService {
  private readonly _posts = signal<GeneratedPost[]>(POSTS);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly posts = this._posts.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  async fetchPublishedPosts(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      this._posts.set(POSTS);
    } catch (err: any) {
      this._error.set(err?.message ?? 'Failed to fetch posts');
    } finally {
      this._loading.set(false);
    }
  }

  async fetchPostBySlug(slug: string): Promise<GeneratedPost | null> {
    return POSTS.find((p) => p.slug === slug) ?? null;
  }

  getAllPosts(): GeneratedPost[] {
    return POSTS;
  }
}
