/**
 * sync-github-projects.mjs
 * Fetches public repos from GitHub and updates src/content/projects/projects.json
 *
 * Usage: node scripts/sync-github-projects.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PROJECTS_FILE = path.join(ROOT, 'src', 'content', 'projects', 'projects.json');
const OVERRIDES_FILE = path.join(ROOT, 'src', 'content', 'projects', 'project-overrides.json');

const GITHUB_USER = 'Wanfeng1028';
const API_URL = `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=updated`;
const USER_AGENT = 'SpaceLabBot/1.0 (+https://github.com/Wanfeng1028/SpaceLab)';
const MAX_PROJECTS = 25;

/**
 * Load overrides from project-overrides.json
 */
function loadOverrides() {
  try {
    const raw = fs.readFileSync(OVERRIDES_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    console.warn('⚠️  project-overrides.json not found or invalid, using empty overrides');
    return {};
  }
}

/**
 * Load existing projects.json (for fallback on API failure)
 */
function loadExistingProjects() {
  try {
    const raw = fs.readFileSync(PROJECTS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Fetch repos from GitHub API
 */
async function fetchRepos() {
  const headers = {
    'User-Agent': USER_AGENT,
    Accept: 'application/vnd.github+json',
  };

  // Use GITHUB_TOKEN if available (for CI to avoid rate limits)
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(API_URL, { headers });

  if (!response.ok) {
    throw new Error(`GitHub API responded with ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Build a project entry from a GitHub repo + overrides
 */
function buildProject(repo, overrides) {
  const name = repo.name;
  const override = overrides[name] || {};

  // Determine if included
  const isFork = repo.fork;
  const isArchived = repo.archived;

  // Skip forks and archived unless explicitly included
  if ((isFork || isArchived) && override.include !== true) {
    return null;
  }

  // Skip if explicitly excluded
  if (override.include === false) {
    return null;
  }

  // Build tags from topics + language
  let tags = [...(repo.topics || [])];
  if (override.tags) {
    tags = override.tags;
  }
  // Capitalize topic tags for display
  tags = tags.map((t) => t.charAt(0).toUpperCase() + t.slice(1));

  return {
    id: name,
    name: name,
    description: override.description || repo.description || '',
    tags,
    language: repo.language || '',
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    status: override.status || (repo.archived ? 'Archived' : 'Building'),
    cover: override.cover || '',
    github: repo.html_url || '',
    demo: override.demo || repo.homepage || '',
    featured: override.featured || false,
    archived: repo.archived || false,
    fork: repo.fork || false,
    updatedAt: repo.updated_at || new Date().toISOString(),
    _order: override.order ?? 999,
  };
}

/**
 * Sort projects: featured first, then by order, then by stars, then by updated_at
 */
function sortProjects(projects) {
  return projects.sort((a, b) => {
    // Featured first
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;

    // Then by order (lower = higher priority)
    if (a._order !== b._order) return a._order - b._order;

    // Then by stars (descending)
    if (a.stars !== b.stars) return b.stars - a.stars;

    // Then by updated_at (descending)
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

/**
 * Main sync logic
 */
async function main() {
  console.log('🔄 Syncing GitHub projects...');

  const existingProjects = loadExistingProjects();
  const overrides = loadOverrides();

  let repos;
  try {
    repos = await fetchRepos();
  } catch (err) {
    console.error(`❌ GitHub API failed: ${err.message}`);
    console.error('   Keeping existing projects.json unchanged.');
    // Write to GitHub Actions output if available
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, 'changed=false\n');
    }
    process.exit(0);
  }

  console.log(`📦 Found ${repos.length} repos for ${GITHUB_USER}`);

  // Build project entries
  const projects = repos.map((repo) => buildProject(repo, overrides)).filter(Boolean);

  // Sort and limit
  const sorted = sortProjects(projects).slice(0, MAX_PROJECTS);

  // Remove internal _order field
  const cleaned = sorted.map(({ _order, ...rest }) => rest);

  // Check if content changed
  const oldJson = JSON.stringify(existingProjects, null, 2);
  const newJson = JSON.stringify(cleaned, null, 2);
  const changed = oldJson !== newJson;

  if (changed) {
    fs.writeFileSync(PROJECTS_FILE, newJson + '\n', 'utf-8');
    console.log(`✅ projects.json updated — ${cleaned.length} projects`);
  } else {
    console.log('ℹ️  No changes detected');
  }

  // Write to GitHub Actions output if available
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
  }
}

main().catch((err) => {
  console.error(`❌ Sync failed: ${err.message}`);
  // Don't exit with error — keep existing data
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, 'changed=false\n');
  }
  process.exit(0);
});
