/**
 * sync-github-projects.ts
 * 移植 scripts/sync-github-projects.mjs：从 GitHub API 获取公开仓库写入 D1
 */

const GITHUB_USER = "Wanfeng1028";
const API_URL = `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=updated`;
const USER_AGENT = "SpaceLabBot/1.0 (+https://github.com/Wanfeng1028/SpaceLab)";

interface GitHubRepo {
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  topics: string[];
  archived: boolean;
  fork: boolean;
  homepage: string | null;
  updated_at: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function runSyncGithubProjects(env: Env): Promise<void> {
  try {
    const headers: Record<string, string> = {
      "User-Agent": USER_AGENT,
      Accept: "application/vnd.github+json",
    };
    if (env.GITHUB_TOKEN) {
      headers["Authorization"] = `Bearer ${env.GITHUB_TOKEN}`;
    }

    console.log("[sync-github] Fetching repos from GitHub API...");
    const resp = await fetch(API_URL, { headers });
    if (!resp.ok) throw new Error(`GitHub API: HTTP ${resp.status}`);
    const repos: GitHubRepo[] = await resp.json();
    console.log(`[sync-github] Found ${repos.length} repos`);

    // 过滤：跳过 fork 和 archived
    const filtered = repos.filter((r) => !r.fork && !r.archived);
    console.log(`[sync-github] ${filtered.length} repos after filtering`);

    const now = new Date().toISOString();
    // 使用一个系统用户 ID 作为 author（取第一个 admin 用户，或固定 ID）
    const authorRow = await env.DB.prepare(
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
    ).first<{ id: string }>();
    const authorId = authorRow?.id || "system";

    let upserted = 0;
    for (const repo of filtered) {
      const slug = slugify(repo.name);
      const tags = (repo.topics || []).map(
        (t) => t.charAt(0).toUpperCase() + t.slice(1)
      );
      const technologies = repo.language ? JSON.stringify([repo.language]) : "[]";
      const githubUrl = repo.html_url || "";
      const websiteUrl = repo.homepage || "";
      const description = repo.description || "";
      const status = repo.archived ? "archived" : "published";

      const existing = await env.DB.prepare(
        "SELECT id FROM projects WHERE slug = ?"
      ).bind(slug).first();

      if (existing) {
        await env.DB.prepare(
          `UPDATE projects SET title=?, description=?, github_url=?, website_url=?,
           language=?, tags=?, technologies=?, status=?, updated_at=?
           WHERE slug=?`
        ).bind(
          repo.name, description, githubUrl, websiteUrl,
          repo.language || "", JSON.stringify(tags), technologies, status, now,
          slug
        ).run();
      } else {
        const id = crypto.randomUUID();
        await env.DB.prepare(
          `INSERT INTO projects (id, slug, title, description, content, cover_url,
           website_url, github_url, language, tags, features, technologies,
           status, view_count, author_id, published_at, deleted_at, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
        ).bind(
          id, slug, repo.name, description, "", "",
          websiteUrl, githubUrl, repo.language || "", JSON.stringify(tags),
          "[]", technologies, status, 0, authorId, now, null, now, now
        ).run();
      }
      upserted++;
    }

    console.log(`[sync-github] Upserted ${upserted} projects`);
  } catch (err) {
    console.error("[sync-github] Error:", err);
  }
}
