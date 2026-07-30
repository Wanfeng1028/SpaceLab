/**
 * JWT 工具函数 — 对齐 Go 版 middleware/auth.go
 * 使用 jose 库（纯 JS，Workers 兼容）
 */
import { SignJWT, jwtVerify } from "jose";
import { generateUUID } from "./uuid";

// ── 类型 ──────────────────────────────────────────────────────────

export interface JWTPayload {
  user_id: string;
  email: string;
  role: string;
  /** 令牌类型：access / refresh */
  typ: string;
  /** 安全 stamp，改密码后批量失效旧 token */
  stamp: string;
  sub: string;
  exp: number;
  iat: number;
  jti: string;
  iss: string;
}

// ── 内部工具 ──────────────────────────────────────────────────────

/** 解析有效期字符串为秒数，如 "24h" → 86400, "7d" → 604800 */
function parseDurationToSeconds(duration: string, defaultSeconds: number): number {
  if (!duration) return defaultSeconds;
  const match = duration.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return defaultSeconds;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * (multipliers[unit] ?? 1) || defaultSeconds;
}

function getSecretKey(secret: string) {
  return new TextEncoder().encode(secret);
}

// ── 核心函数 ──────────────────────────────────────────────────────

/** 生成 JWT（内部统一方法） */
async function generateToken(
  secret: string,
  userId: string,
  email: string,
  role: string,
  typ: string,
  stamp: string,
  expirySeconds: number
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    user_id: userId,
    email,
    role,
    typ,
    stamp,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer("spacelab-backend")
    .setJti(generateUUID())
    .setIssuedAt(now)
    .setExpirationTime(now + expirySeconds)
    .sign(getSecretKey(secret));
}

/** 生成 access token（短时效） */
export async function generateAccessToken(
  secret: string,
  userId: string,
  email: string,
  role: string,
  stamp: string,
  jwtExpiration?: string
): Promise<string> {
  const seconds = parseDurationToSeconds(jwtExpiration ?? "", 86400); // 默认 24h
  return generateToken(secret, userId, email, role, "access", stamp, seconds);
}

/** 生成 refresh token（长时效） */
export async function generateRefreshToken(
  secret: string,
  userId: string,
  email: string,
  role: string,
  stamp: string,
  jwtRefreshExpiration?: string
): Promise<string> {
  const seconds = parseDurationToSeconds(jwtRefreshExpiration ?? "", 604800); // 默认 168h/7d
  return generateToken(secret, userId, email, role, "refresh", stamp, seconds);
}

/** 验证并解析 token */
export async function verifyToken(token: string, secret: string): Promise<JWTPayload> {
  const secretKey = getSecretKey(secret);
  const { payload } = await jwtVerify(token, secretKey, {
    algorithms: ["HS256"],
  });
  return payload as unknown as JWTPayload;
}
