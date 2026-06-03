import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { Article, ArticleMeta, GithubPostFrontmatter, PublishTarget, GithubTreeEntry, ArticleSource } from '../models/article.model';
import { MarkdownRendererService } from './markdown-renderer.service';
import { POSTS, type GeneratedPost } from '../../../generated/content.generated';

/**
 * Unified article repository that aggregates articles from multiple sources:
 * - static: build-time generated content (content.generated.ts)
 * - github: runtime-fetched from GitHub repo via REST API
 * - supabase: placeholder for future Supabase integration
 *
 * The repository layer is the single source of truth for article queries.
 * Components should never import POSTS directly — they go through this service.
 */
@Injectable({ providedIn: 'root' })
export class ArticleRepositoryService {
  private http = inject(HttpClient);
  private markdownRenderer = inject(MarkdownRendererService);

  // GitHub repo config
  private readonly GITHUB_REPO = 'Wanfong1028/SpaceLab';
  private readonly GITHUB_BRANCH = 'main';
  private readonly GITHUB_BASE_URL = `https://api.github.com/repos/${this.GITHUB_REPO}/git/trees`;

  // Reactive state for github articles
  private readonly _githubPosts = signal<ArticleMeta[]>([]);
  private readonly _githubLoading = signal(false);
  private readonly _githubError = signal<string | null>(null);

  readonly githubPosts = this._githubPosts.asReadonly();
  readonly githubLoading = this._githubLoading.asReadonly();
  readonly githubError = this._githubError.asReadonly();

  /**
   * Get all articles from all sources (static + github).
   * Static articles take priority (returned first).
   */
  getAllArticles(): Article[] {
    const staticArticles: Article[] = POSTS.map((p) => this.toArticle(p, 'static'));
    const githubArticles: Article[] = this._githubPosts().map((m) => ({
      ...m,
      contentHtml: '', // placeholder — fetchFullArticle() populates contentHtml
    }));
    return [...staticArticles, ...githubArticles];
  }

  /**
   * Fetch a single article by slug, trying static first, then github.
   */
  async fetchArticleBySlug(slug: string): Promise<Article | null> {
    // 1. Try static
    const staticPost = POSTS.find((p) => p.slug === slug);
    if (staticPost) {
      return this.toArticle(staticPost, 'static');
    }

    // 2. Try github
    return this.fetchGithubArticleBySlug(slug);
  }

  /**
   * Fetch all github-hosted articles and populate the reactive signal.
   */
  async fetchGithubArticles(): Promise<void> {
    this._githubLoading.set(true);
    this._githubError.set(null);

    try {
      // Step 1: Get the tree for content/posts directory
      const treeResponse = await firstValueFrom(
        this.http.get<{ tree: GithubTreeEntry[] }>(
          `${this.GITHUB_BASE_URL}/${this.GITHUB_BRANCH}?recursive=1`,
        ),
      );

      const postDirs = new Set<string>();
      for (const entry of treeResponse.tree ?? []) {
        // Match paths like content/posts/{slug}/index.md
        const match = entry.path.match(/^content\/posts\/([^/]+)\/index\.md$/);
        if (match) {
          postDirs.add(match[1]);
        }
      }

      // Step 2: Fetch index.json for metadata
      const indexUrl = `https://raw.githubusercontent.com/${this.GITHUB_REPO}/${this.GITHUB_BRANCH}/content/posts/index.json`;
      let indexData: { posts: GithubPostFrontmatter[] } | null = null;
      try {
        indexData = await firstValueFrom(this.http.get<{ posts: GithubPostFrontmatter[] }>(indexUrl));
      } catch {
        // If index.json doesn't exist, fall back to tree-based discovery
      }

      const articles: ArticleMeta[] = [];

      if (indexData?.posts) {
        // Use index.json for metadata
        for (const post of indexData.posts) {
          if (post.published !== false) {
            articles.push({
              source: 'github',
              slug: post.slug,
              title: post.title,
              date: post.date,
              category: post.category,
              tags: post.tags ?? [],
              summary: post.summary ?? '',
              cover: post.cover,
              readingTime: this.estimateReadingTime(post.summary ?? ''),
            });
          }
        }
      } else {
        // Fallback: use discovered slugs with minimal metadata
        for (const slug of postDirs) {
          articles.push({
            source: 'github',
            slug,
            title: slug,
            date: '',
            category: '',
            tags: [],
            summary: '',
            readingTime: 0,
          });
        }
      }

      this._githubPosts.set(articles);
    } catch (err: any) {
      this._githubError.set(err?.message ?? 'Failed to fetch GitHub articles');
    } finally {
      this._githubLoading.set(false);
    }
  }

  /**
   * Fetch a single github article by slug, including rendered HTML content.
   */
  private async fetchGithubArticleBySlug(slug: string): Promise<Article | null> {
    try {
      // Fetch index.json
      const indexUrl = `https://raw.githubusercontent.com/${this.GITHUB_REPO}/${this.GITHUB_BRANCH}/content/posts/index.json`;
      let indexData: { posts: GithubPostFrontmatter[] } | null = null;
      try {
        indexData = await firstValueFrom(this.http.get<{ posts: GithubPostFrontmatter[] }>(indexUrl));
      } catch {
        // index.json might not exist yet
      }

      const frontmatter = indexData?.posts?.find((p) => p.slug === slug);
      if (!frontmatter) {
        return null;
      }

      // Fetch markdown content
      const mdUrl = `https://raw.githubusercontent.com/${this.GITHUB_REPO}/${this.GITHUB_BRANCH}/content/posts/${slug}/index.md`;
      const markdown = await firstValueFrom(this.http.get(mdUrl, { responseType: 'text' }));

      // Strip frontmatter if present
      const content = this.stripFrontmatter(markdown);

      // Resolve relative asset paths
      const resolvedContent = this.resolveAssetPaths(content, slug);

      // Render markdown to HTML
      const contentHtml = await this.markdownRenderer.render(resolvedContent);

      return {
        source: 'github',
        slug: frontmatter.slug,
        title: frontmatter.title,
        date: frontmatter.date,
        category: frontmatter.category,
        tags: frontmatter.tags ?? [],
        summary: frontmatter.summary ?? '',
        cover: frontmatter.cover,
        readingTime: frontmatter.summary ? this.estimateReadingTime(frontmatter.summary) : 0,
        contentHtml,
      };
    } catch {
      return null;
    }
  }

  /**
   * Publish an article to the specified target.
   * For github: calls /api/github/publish endpoint.
   */
  async publishArticle(
    payload: {
      slug: string;
      title: string;
      summary: string;
      category: string;
      tags: string[];
      content: string;
      coverFile?: File | null;
    },
    target: PublishTarget,
  ): Promise<{ success: boolean; error?: string }> {
    if (target === 'github') {
      return this.publishToGithub(payload);
    } else if (target === 'supabase') {
      return { success: false, error: 'Supabase publishing not yet implemented' };
    } else {
      // 'static' — in a real app this would write to a local file or trigger a build
      return { success: false, error: 'Static publishing requires a build step. Use GitHub target.' };
    }
  }

  /**
   * Internal: publish to GitHub via /api/github/publish endpoint.
   * The API endpoint handles authentication server-side.
   */
  private async publishToGithub(payload: {
    slug: string;
    title: string;
    summary: string;
    category: string;
    tags: string[];
    content: string;
    coverFile?: File | null;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('slug', payload.slug);
      formData.append('title', payload.title);
      formData.append('summary', payload.summary);
      formData.append('category', payload.category);
      formData.append('tags', JSON.stringify(payload.tags));
      formData.append('content', payload.content);
      if (payload.coverFile) {
        formData.append('coverFile', payload.coverFile);
      }

      const response = await firstValueFrom(
        this.http.post<{ success: boolean; error?: string }>('/api/github/publish', formData),
      );

      return response;
    } catch (err: any) {
      return { success: false, error: err?.message ?? 'Publish failed' };
    }
  }

  // --- Helpers ---

  private toArticle(post: GeneratedPost, source: ArticleSource): Article {
    return {
      source,
      slug: post.slug,
      title: post.title,
      date: post.date,
      category: post.category,
      tags: post.tags,
      summary: post.summary,
      cover: post.cover,
      readingTime: post.readingTime,
      prevSlug: post.prevSlug ?? undefined,
      prevTitle: post.prevTitle ?? undefined,
      nextSlug: post.nextSlug ?? undefined,
      nextTitle: post.nextTitle ?? undefined,
      contentHtml: post.contentHtml,
    };
  }

  private stripFrontmatter(content: string): string {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (match) {
      return match[2] ?? content;
    }
    return content;
  }

  private resolveAssetPaths(content: string, slug: string): string {
    // Replace relative ./assets/xxx with absolute GitHub raw URL
    const baseRawUrl = `https://raw.githubusercontent.com/${this.GITHUB_REPO}/${this.GITHUB_BRANCH}/content/posts/${slug}`;
    return content.replace(
      /!\[([^\]]*)\]\(\.\/assets\/([^)]+)\)/g,
      `![$1](${baseRawUrl}/assets/$2)`,
    );
  }

  private estimateReadingTime(text: string): number {
    const words = text.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
  }
}
