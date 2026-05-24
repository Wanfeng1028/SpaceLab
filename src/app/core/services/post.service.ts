import { Injectable, signal } from '@angular/core';
import type { Post } from '../models';

@Injectable({ providedIn: 'root' })
export class PostService {
  private readonly _posts = signal<Post[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly posts = this._posts.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  async fetchPublishedPosts(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      // TODO: integrate with Supabase
      this._posts.set([]);
    } catch (err: any) {
      this._error.set(err?.message ?? 'Failed to fetch posts');
    } finally {
      this._loading.set(false);
    }
  }

  async fetchPostBySlug(_slug: string): Promise<Post | null> {
    // TODO: integrate with Supabase
    return null;
  }
}
