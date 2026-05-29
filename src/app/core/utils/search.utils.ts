/**
 * Unified search utilities for SpaceLab.
 * Provides normalized text matching with alias expansion.
 */

// ---------------------------------------------------------------------------
// Alias dictionary — lightweight, only participates in matching
// ---------------------------------------------------------------------------

const SEARCH_ALIASES: Record<string, string[]> = {
  gpt5: ['gpt 5', 'gpt-5'],
  'gpt-5': ['gpt5', 'gpt 5'],
  threejs: ['three js', 'three.js'],
  'three.js': ['threejs', 'three js'],
  webgl: ['web gl'],
  openai: ['open ai'],
  claude: ['anthropic'],
  anthropic: ['claude'],
  agent: ['智能体', '代理'],
  智能体: ['agent'],
  llm: ['大语言模型', '语言模型'],
  大模型: ['llm', '模型'],
  地图: ['gis', 'map', 'maps'],
  gis: ['地图', '测绘'],
  遥感: ['remote sensing'],
  框架: ['framework'],
  工具: ['tool'],
  开源: ['opensource', 'open source'],
  模型: ['model', 'llm', '大模型'],
  产品: ['product'],
  融资: ['funding'],
  机器人: ['robot', 'vla'],
};

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

/** Strip HTML tags from a string. */
function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, ' ');
}

/** Common separator characters that should be treated as spaces. */
const SEPARATOR_RE =
  /[_\-*/\\.,:;|~`!@#$%^&=+\[\]{}<>«»""''（）()\u3001\u3002\uff0c\uff0e\uff1b\uff1a\uff01\uff1f\u2014\u2013]+/g;

/**
 * Normalize any value into a searchable lowercase string.
 *
 * - Handles undefined / null → ''
 * - NFKC normalization (full‑width → half‑width)
 * - Strips HTML tags
 * - Converts common separators to spaces
 * - Collapses whitespace & trims
 */
export function normalizeSearchText(value: unknown): string {
  if (value == null) return '';
  let s = String(value);
  s = s.normalize('NFKC');
  s = stripHtml(s);
  s = s.toLowerCase();
  s = s.replace(SEPARATOR_RE, ' ');
  s = s.replace(/\s+/g, ' ');
  return s.trim();
}

/**
 * Like `normalizeSearchText` but with ALL spaces removed.
 * Useful for matching "threejs" against "three js".
 */
export function compactSearchText(value: unknown): string {
  return normalizeSearchText(value).replace(/\s+/g, '');
}

/**
 * Merge multiple fields into one searchable text block.
 */
export function buildSearchText(fields: unknown[]): string {
  return fields
    .flat()
    .map((f) => normalizeSearchText(f))
    .filter(Boolean)
    .join(' ');
}

/**
 * Check whether a search text matches a query.
 *
 * Matching rules:
 * 1. Empty query → always matches.
 * 2. Query is normalized and split into tokens (space‑separated).
 * 3. Every token must be found in either the normalized text, the compact
 *    text, or via alias expansion.
 */
export function matchesSearchQuery(searchText: string, query: string): boolean {
  const q = normalizeSearchText(query);
  if (!q) return true;

  const textNorm = normalizeSearchText(searchText);
  const textCompact = compactSearchText(searchText);

  const tokens = q.split(' ').filter(Boolean);

  return tokens.every((token) => {
    // Direct match in normalized text
    if (textNorm.includes(token)) return true;

    // Direct match in compact text (handles "threejs" ↔ "three js")
    const tokenCompact = compactSearchText(token);
    if (textCompact.includes(tokenCompact)) return true;

    // Alias expansion
    const aliases = SEARCH_ALIASES[token] ?? SEARCH_ALIASES[tokenCompact] ?? [];
    return aliases.some((alias) => {
      const aliasNorm = normalizeSearchText(alias);
      if (textNorm.includes(aliasNorm)) return true;
      const aliasCompact = compactSearchText(alias);
      return textCompact.includes(aliasCompact);
    });
  });
}
