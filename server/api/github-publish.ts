/**
 * Server-side API route handler for GitHub publishing.
 *
 * In production (GitHub Pages / Netlify / Vercel), this would be a serverless function.
 * For local dev, use the proxy configuration (proxy.conf.json) pointing to scripts/api-server.mjs.
 *
 * SECURITY: GitHub tokens are NEVER stored in frontend code.
 * They are managed server-side via environment variables or secret managers.
 */

import { Request, Response } from 'express';

interface IndexEntry {
  slug: string;
  title: string;
  date: string;
  category: string;
  tags: string[];
  summary: string;
  cover?: string;
  published?: boolean;
}

interface IndexData {
  posts: IndexEntry[];
}

/**
 * Helper: GET file from GitHub to get SHA (or null if not found).
 */
async function getGithubFileSha(
  token: string,
  repo: string,
  path: string,
  branch: string,
): Promise<{ sha: string | null; content?: string }> {
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (!res.ok) {
      return { sha: null };
    }
    const data = await res.json();
    return { sha: data.sha, content: data.content };
  } catch {
    return { sha: null };
  }
}

/**
 * Helper: PUT file to GitHub (create or update).
 */
async function putGithubFile(
  token: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string,
  sha?: string | null,
): Promise<boolean> {
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      content,
      branch,
      ...(sha ? { sha } : {}),
    }),
  });
  return res.ok;
}

/**
 * POST /api/github/publish
 *
 * Accepts multipart form data with article fields and publishes to GitHub.
 * The server reads GITHUB_TOKEN from environment variables.
 */
export async function githubPublishHandler(req: Request, res: Response): Promise<void> {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    res.status(500).json({
      success: false,
      error: 'GitHub token not configured on server',
    });
    return;
  }

  const { slug, title, summary, category, tags, content, coverFile } = req.body as any;

  if (!slug || !title || !content) {
    res.status(400).json({ success: false, error: 'Missing required fields: slug, title, content' });
    return;
  }

  const GITHUB_REPO = 'Wanfeng1028/SpaceLab';
  const GITHUB_BRANCH = 'main';

  // Build frontmatter
  const tagArray = typeof tags === 'string' ? JSON.parse(tags) : tags;
  const frontmatter = `---
title: ${title}
slug: ${slug}
date: ${new Date().toISOString().split('T')[0]}
category: ${category}
tags:
${tagArray.map((t: string) => `  - ${t}`).join('\n')}
summary: ${summary || ''}
published: true
---

${content}`;

  const mdPath = `public/content/posts/${slug}/index.md`;
  const mdContent = Buffer.from(frontmatter).toString('base64');

  // 1. Upload/update markdown file
  const mdSha = (await getGithubFileSha(token, GITHUB_REPO, mdPath, GITHUB_BRANCH)).sha;
  const mdOk = await putGithubFile(token, GITHUB_REPO, mdPath, mdContent, `Publish: ${title}`, GITHUB_BRANCH, mdSha);
  if (!mdOk) {
    res.status(500).json({ success: false, error: 'Failed to publish markdown file' });
    return;
  }

  // 2. Upload cover image if provided (with SHA check)
  if (coverFile) {
    const coverPath = `public/content/posts/${slug}/assets/${coverFile.name}`;
    const coverContent = typeof coverFile === 'string' ? coverFile : Buffer.from(coverFile).toString('base64');
    const coverSha = (await getGithubFileSha(token, GITHUB_REPO, coverPath, GITHUB_BRANCH)).sha;
    const coverOk = await putGithubFile(
      token,
      GITHUB_REPO,
      coverPath,
      coverContent,
      `Add cover asset: ${coverFile.name}`,
      GITHUB_BRANCH,
      coverSha,
    );
    if (!coverOk) {
      // Non-fatal: log but continue
      console.warn(`Cover upload failed for ${coverPath}`);
    }
  }

  // 3. Update index.json
  const indexPath = 'public/content/posts/index.json';
  const { sha: indexSha, content: indexContent } = await getGithubFileSha(token, GITHUB_REPO, indexPath, GITHUB_BRANCH);

  let indexData: IndexData = { posts: [] };
  if (indexContent && indexSha) {
    try {
      // GitHub returns base64-encoded content
      const decoded = Buffer.from(indexContent, 'base64').toString('utf-8');
      indexData = JSON.parse(decoded) as IndexData;
    } catch {
      // Corrupted index.json — start fresh
      console.warn('Failed to parse existing index.json, starting fresh');
    }
  }

  // Find or create entry
  const existingIdx = indexData.posts.findIndex((p) => p.slug === slug);
  const entry: IndexEntry = {
    slug,
    title,
    date: new Date().toISOString().split('T')[0],
    category,
    tags: tagArray,
    summary: summary || '',
    cover: coverFile ? `public/content/posts/${slug}/assets/${coverFile.name}` : undefined,
    published: true,
  };

  if (existingIdx >= 0) {
    indexData.posts[existingIdx] = entry;
  } else {
    indexData.posts.push(entry);
  }

  // Sort by date descending
  indexData.posts.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));

  const newIndexContent = Buffer.from(JSON.stringify(indexData, null, 2)).toString('base64');
  const indexOk = await putGithubFile(
    token,
    GITHUB_REPO,
    indexPath,
    newIndexContent,
    `Update index.json: ${title}`,
    GITHUB_BRANCH,
    indexSha,
  );

  if (!indexOk) {
    res.status(500).json({
      success: false,
      error: 'Article MD published but index.json update failed — article may not appear in list',
    });
    return;
  }

  res.json({
    success: true,
    url: `https://github.com/${GITHUB_REPO}/blob/${GITHUB_BRANCH}/${mdPath}`,
  });
}
