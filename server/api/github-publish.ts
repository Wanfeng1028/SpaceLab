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

/**
 * POST /api/github/publish
 *
 * Accepts multipart form data with article fields and publishes to GitHub.
 * The server reads GITHUB_TOKEN from environment variables.
 */
export function githubPublishHandler(req: Request, res: Response): void {
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

  // Check if file exists (to get SHA)
  const checkUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${mdPath}`;
  let sha: string | null = null;
  try {
    const checkRes = await fetch(checkUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (checkRes.ok) {
      const data = await checkRes.json();
      sha = data.sha;
    }
  } catch {
    // File doesn't exist yet, sha will be null
  }

  const putUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${mdPath}`;
  const putRes = await fetch(putUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `Publish: ${title}`,
      content: mdContent,
      branch: GITHUB_BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!putRes.ok) {
    const errorData = await putRes.json().catch(() => ({}));
    res.status(putRes.status).json({
      success: false,
      error: errorData.message || 'GitHub API error',
    });
    return;
  }

  // Upload cover image if provided
  if (coverFile) {
    const coverPath = `public/content/posts/${slug}/assets/${coverFile.name}`;
    const coverContent = typeof coverFile === 'string' ? coverFile : Buffer.from(coverFile).toString('base64');

    const coverPutUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${coverPath}`;
    await fetch(coverPutUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Add cover asset: ${coverFile.name}`,
        content: coverContent,
        branch: GITHUB_BRANCH,
      }),
    });
  }

  res.json({
    success: true,
    url: `https://github.com/${GITHUB_REPO}/blob/${GITHUB_BRANCH}/${mdPath}`,
  });
}
