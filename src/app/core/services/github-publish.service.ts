/**
 * Service interface for GitHub publishing operations.
 * The actual implementation calls /api/github/publish — never handles tokens directly.
 */
import { Observable } from 'rxjs';

export interface PublishResult {
  success: boolean;
  error?: string;
  url?: string;
}

export interface GithubPublishOptions {
  /** GitHub personal access token (handled server-side, never stored in frontend) */
  token?: never;
  repo?: string;
  branch?: string;
}

/**
 * Abstract service for publishing content to GitHub repositories.
 * Frontend components call this service, which delegates to server-side API.
 * This ensures GitHub tokens are never exposed in client code.
 */
export abstract class GithubPublishService {
  abstract publishArticle(
    slug: string,
    title: string,
    summary: string,
    category: string,
    tags: string[],
    content: string,
    coverFile?: File | null,
  ): Observable<PublishResult>;

  abstract publishDraft(
    slug: string,
    title: string,
    content: string,
  ): Observable<PublishResult>;
}
