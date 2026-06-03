/**
 * Unified article model used across all content sources.
 * Bridges the gap between GeneratedPost (static) and GitHub/Supabase articles.
 */

/** Source origin of an article */
export type ArticleSource = 'static' | 'github' | 'supabase';

/** Minimal metadata shared by all article sources */
export interface ArticleMeta {
  source: ArticleSource;
  slug: string;
  title: string;
  date: string;
  category: string;
  tags: string[];
  summary: string;
  cover?: string;
  readingTime: number;
  /** View count (from Supabase or fallback) */
  viewCount?: number;
  /** Like count (from Supabase or fallback) */
  likeCount?: number;
  /** For prev/next navigation (static only) */
  prevSlug?: string;
  prevTitle?: string;
  nextSlug?: string;
  nextTitle?: string;
}

/** A rendered article with sanitized HTML content */
export interface Article extends ArticleMeta {
  contentHtml: string;
}

/** GitHub API file representation */
export interface GithubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url?: string;
  git_url: string;
  download_url?: string;
  type: 'file' | 'dir';
  _content?: string;
}

/** GitHub repository content entry (from tree API) */
export interface GithubTreeEntry {
  path: string;
  mode: '100644' | '100755' | '040000' | '160000';
  type: 'blob' | 'tree' | 'commit';
  sha: string;
  size: number;
  url: string;
}

/** Frontmatter parsed from a GitHub-hosted Markdown file */
export interface GithubPostFrontmatter {
  title: string;
  slug: string;
  date: string;
  category: string;
  tags?: string[];
  cover?: string;
  summary?: string;
  published?: boolean;
}

/** Publish payload sent to /api/github/publish */
export interface GithubPublishPayload {
  slug: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  content: string;
  /** Optional cover image file (multipart) */
  coverFile?: File | null;
}

/** Publish target selection */
export type PublishTarget = 'static' | 'github' | 'supabase';

/** Normalize null to undefined for optional fields */
function undefOrNull<T extends string>(v: T | null | undefined): T | undefined {
  return v ?? undefined;
}
