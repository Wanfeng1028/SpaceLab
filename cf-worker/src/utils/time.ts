/**
 * 时间工具函数
 */

/** 获取当前 ISO 8601 时间字符串 */
export function nowISO(): string {
  return new Date().toISOString();
}

/** 将 Date 转为 ISO 8601 字符串 */
export function toISO(date: Date): string {
  return date.toISOString();
}

/** 将 ISO 8601 字符串解析为 Date */
export function fromISO(iso: string): Date {
  return new Date(iso);
}

/** 获取当前 Unix 时间戳（秒） */
export function unixNow(): number {
  return Math.floor(Date.now() / 1000);
}

/** 判断 ISO 时间字符串是否已过期 */
export function isExpired(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

/** 解析持续时间字符串为毫秒数，如 "24h" → 86400000, "7d" → 604800000 */
export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 0;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return value * (multipliers[unit] || 0);
}
