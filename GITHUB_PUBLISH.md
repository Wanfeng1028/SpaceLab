# GitHub Publishing Setup

## Overview

SpaceLab supports publishing articles to GitHub via a server-side API. The GitHub token is **never** stored in frontend code.

## Local Development

1. Start the local API server:
   ```bash
   GITHUB_TOKEN=your_personal_access_token node scripts/api-server.mjs
   ```

2. Start Angular with proxy:
   ```bash
   ng serve --proxy-config proxy.conf.json
   ```

3. The admin/write page will POST to `/api/github/publish`, which the proxy forwards to the local API server.

## Production Deployment

For production, deploy a serverless function (Vercel, Netlify, Cloudflare Workers) that:
- Reads `GITHUB_TOKEN` from environment secrets
- Handles `POST /api/github/publish`
- Calls GitHub REST API to write files

The frontend code already calls `/api/github/publish` — no changes needed.

## Security

- GitHub tokens are server-side only
- No tokens in `angular.json`, `environment.ts`, or any frontend file
- Admin routes are protected by `adminGuard` (placeholder)
