/**
 * UUID 生成工具
 */

/** 生成一个新的 UUID v4 */
export function generateUUID(): string {
  return crypto.randomUUID();
}
