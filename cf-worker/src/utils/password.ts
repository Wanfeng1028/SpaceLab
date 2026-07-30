/**
 * 密码工具（带降级策略）— 对齐 Go 版 bcrypt 逻辑
 *
 * AUTH_MODE:
 *  - "full"         → 使用 bcryptjs（纯 JS，Workers 兼容）
 *  - "oauth-only"   → 密码登录不可用，函数返回错误
 */
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * 密码哈希
 * @throws 如果 AUTH_MODE 为 "oauth-only"
 */
export async function hashPassword(
  password: string,
  authMode: string
): Promise<string> {
  if (authMode === "oauth-only") {
    throw new Error("Password authentication is not available in oauth-only mode");
  }
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * 密码验证
 * @returns true 如果密码匹配
 * @throws 如果 AUTH_MODE 为 "oauth-only"
 */
export async function verifyPassword(
  password: string,
  hash: string,
  authMode: string
): Promise<boolean> {
  if (authMode === "oauth-only") {
    throw new Error("Password authentication is not available in oauth-only mode");
  }
  return bcrypt.compare(password, hash);
}
