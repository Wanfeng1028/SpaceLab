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
const GITHUB_REPO = 'Wanfeng1028/SpaceLab';
const GITHUB_BRANCH = 'main';

if (!GITHUB_TOKEN) {
  console.error('ERROR: GITHUB_TOKEN environment variable is required');
  process.exit(1);
}

app.use(express.json());

// Multipart form data handling
const upload = multer({ dest: 'tmp/' });

/**
 * Helper: GET file from GitHub to get SHA (or null if not found).
 */
async function getGithubFileSha(repo, path, branch) {
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
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
async function putGithubFile(repo, path, content, message, branch, sha) {
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
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

    // 1. Upload/update markdown file
    const mdPath = `public/content/posts/${slug}/index.md`;
    const mdContent = Buffer.from(frontmatter).toString('base64');
    const mdSha = (await getGithubFileSha(GITHUB_REPO, mdPath, GITHUB_BRANCH)).sha;
    const mdOk = await putGithubFile(GITHUB_REPO, mdPath, mdContent, `Publish: ${title}`, GITHUB_BRANCH, mdSha);
    if (!mdOk) {
      res.status(500).json({ success: false, error: 'Failed to publish markdown file' });
      return;
    }

    // 2. Upload cover image if provided (with SHA check)
    if (req.file) {
      const coverPath = `public/content/posts/${slug}/assets/${req.file.originalname}`;
      const coverContent = req.file.buffer.toString('base64');
      const coverSha = (await getGithubFileSha(GITHUB_REPO, coverPath, GITHUB_BRANCH)).sha;
      const coverOk = await putGithubFile(
        GITHUB_REPO,
        coverPath,
        coverContent,
        `Add cover asset: ${req.file.originalname}`,
        GITHUB_BRANCH,
        coverSha,
      );
      if (!coverOk) {
        console.warn(`Cover upload failed for ${coverPath}`);
      }
    }

    // 3. Update index.json
    const indexPath = 'public/content/posts/index.json';
    const { sha: indexSha, content: indexContent } = await getGithubFileSha(GITHUB_REPO, indexPath, GITHUB_BRANCH);

    let indexData = { posts: [] };
    if (indexContent && indexSha) {
      try {
        const decoded = Buffer.from(indexContent, 'base64').toString('utf-8');
        indexData = JSON.parse(decoded);
      } catch {
        console.warn('Failed to parse existing index.json, starting fresh');
      }
    }

    // Find or create entry
    const existingIdx = indexData.posts.findIndex((p) => p.slug === slug);
    const entry = {
      slug,
      title,
      date: new Date().toISOString().split('T')[0],
      category,
      tags: tagArray,
      summary: summary || '',
      cover: req.file ? `public/content/posts/${slug}/assets/${req.file.originalname}` : undefined,
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
