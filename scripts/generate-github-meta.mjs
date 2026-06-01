import { mkdir, writeFile } from 'node:fs/promises';

const repo = process.env.GITHUB_REPOSITORY || 'Wanfeng1028/SpaceLab';
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

const fallback = {
  owner: 'Wanfeng1028',
  name: 'SpaceLab',
  stars: 0,
  forks: 0,
  openIssues: 0,
  updatedAt: new Date().toISOString(),
  source: 'fallback',
};

async function main() {
  await mkdir('public', { recursive: true });

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      throw new Error(`GitHub API failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    const meta = {
      owner: data.owner?.login ?? 'Wanfeng1028',
      name: data.name ?? 'SpaceLab',
      stars: data.stargazers_count ?? 0,
      forks: data.forks_count ?? 0,
      openIssues: data.open_issues_count ?? 0,
      updatedAt: new Date().toISOString(),
      source: 'github-api',
    };

    await writeFile('public/github-meta.json', JSON.stringify(meta, null, 2), 'utf8');
    console.log('✓ Generated public/github-meta.json');
  } catch (error) {
    console.warn(`⚠ ${error.message}`);
    await writeFile('public/github-meta.json', JSON.stringify(fallback, null, 2), 'utf8');
    console.log('✓ Generated fallback public/github-meta.json');
  }
}

main();
