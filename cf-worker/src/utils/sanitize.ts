/**
 * 文本清洗工具 — 对齐 Go 版 utils/sanitize.go
 */

/**
 * 清洗评论内容（严格模式，只保留纯文本）
 * 对齐 bluemonday StrictPolicy：去除所有 HTML 标签
 */
export function sanitizeComment(text: string): string {
  if (!text) return "";
  // 去除所有 HTML 标签
  const stripped = text.replace(/<[^>]*>/g, "");
  // 解码常见 HTML 实体
  const decoded = stripped
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
  // 再次去除标签（防止实体解码后暴露新标签）
  const clean = decoded.replace(/<[^>]*>/g, "");
  return clean.trim();
}

/**
 * 清洗纯字符串字段（用户名、标题等）
 * 正则去除 HTML 标签
 */
export function sanitizePlainString(text: string): string {
  if (!text) return "";
  return text.replace(/<[^>]*>/g, "").trim();
}
