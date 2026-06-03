/**
 * Local API server for GitHub publishing during development.
 *
 * Run with: node scripts/api-server.mjs
 * Requires GITHUB_TOKEN environment variable.
 *
 * This server is NOT needed for production deployments.
 * In production, use a serverless function or CI workflow instead.
 */

const express = require('express');
const multer = require('multer');
const app = express();
const PORT = process.env.API_PORT || 3001;

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = 'Wanfong1028/SpaceLab';
const GITHUB_BRANCH = 'main';

if (!GITHUB_TOKEN) {
  console.error('ERROR: GITHUB_TOKEN environment variable is required');
  process.exit(1);
}

app.use(express.json());

// Multipart form data handling
const upload = multer({ dest: 'tmp/' });
app.post('/api/github/publish', upload.single('coverFile'), async (req, res) => {
  try {
    const { slug, title, summary, category, tags, content } = req.body;

    if (!slug || !title || !content) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }

    // Build frontmatter
    const tagArray = typeof tags === 'string' ? JSON.parse(tags) : tags;
    const frontmatter = `---
title: ${title}
slug: ${slug}
date: ${new Date().toISOString().split('T')[0]}
category: ${category}
tags:
${tagArray.map((t) => `  - ${t}`).join('\n')}
summary: ${summary || ''}
published: true
---

${content}`;

    // Upload to GitHub
    const mdPath = `content/posts/${slug}/index.md`;
    const mdContent = Buffer.from(frontmatter).toString('base64');

    // Check if file exists (to get SHA)
    const checkUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${mdPath}`;
    let sha = null;
    try {
      const checkRes = await fetch(checkUrl, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
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
        Authorization: `Bearer ${GITHUB_TOKEN}`,
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
    if (req.file) {
      const coverPath = `content/posts/${slug}/assets/${req.file.originalname}`;
      const coverContent = req.file.buffer.toString('base64');

      const coverPutUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${coverPath}`;
      await fetch(coverPutUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Add cover asset: ${req.file.originalname}`,
          content: coverContent,
          branch: GITHUB_BRANCH,
        }),
      });
    }

    res.json({
      success: true,
      url: `https://github.com/${GITHUB_REPO}/blob/${GITHUB_BRANCH}/${mdPath}`,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

app.listen(PORT, () => {
  console.log(`GitHub publish API server running on http://localhost:${PORT}`);
  console.log(`Target repo: ${GITHUB_REPO}`);
});
