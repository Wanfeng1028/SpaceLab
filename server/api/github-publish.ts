/**
 * Server-side API route handler for GitHub publishing.
 *
 * In production (GitHub Pages / Netlify / Vercel), this would be a serverless function.
 * For local dev, run with: npx ng serve --extra-headers enable-remote-hacks=true
 * or use the proxy configuration in angular.json.
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

  // In a real implementation, parse multipart form data here
  // and call GitHub REST API:
  //
  // PUT /repos/{owner}/{repo}/contents/content/posts/{slug}/index.md
  // {
  //   "message": "Publish: {title}",
  //   "content": "<base64-encoded-markdown>",
  //   "branch": "main"
  // }
  //
  // For cover images:
  // PUT /repos/{owner}/{repo}/contents/content/posts/{slug}/assets/{filename}

  // Placeholder response — remove when real implementation is added
  res.json({
    success: true,
    url: `https://github.com/Wanfong1028/SpaceLab/blob/main/content/posts/${req.body?.slug}/index.md`,
  });
}

/**
 * Proxy configuration for local development.
 * Add this to angular.json serve options or use a separate proxy file:
 *
 * {
 *   "/api": {
 *     "target": "http://localhost:3001",
 *     "secure": false
 *   }
 * }
 *
 * Then run a small Node.js API server on port 3001 with GITHUB_TOKEN set.
 */
