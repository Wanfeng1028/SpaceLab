/**
 * OAuth 服务 — 对齐 Go 版 service/oauth.go
 * 支持 Google + GitHub OAuth 登录
 */
import { eq, and, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { users } from "../db/schema";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt";
import { generateUUID } from "../utils/uuid";
import { nowISO } from "../utils/time";
import type { AuthResponse, UserInfo } from "./auth.service";

// ── 类型 ──────────────────────────────────────────────────────────

interface OAuthProfile {
  id: string;
  email: string;
  username: string;
  avatarUrl: string;
  name: string;
}

// ── 工具函数 ──────────────────────────────────────────────────────

function getDB(env: Env) {
  return drizzle(env.DB);
}

function toUserInfo(u: typeof users.$inferSelect): UserInfo {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    role: u.role,
    status: u.status || "active",
    avatar_url: u.avatarUrl || "",
    email_verified_at: u.emailVerifiedAt || null,
    created_at: u.createdAt,
  };
}

/** 生成随机 state */
function genState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** 获取 OAuth 回调基础 URL */
function getCallbackBaseURL(env: Env): string {
  return (env.SITE_URL || "http://localhost:4200").replace(/\/$/, "");
}

/** 从邮箱提取用户名 */
function baseUsernameFromEmail(email: string): string {
  const idx = email.indexOf("@");
  if (idx > 0) return email.slice(0, idx);
  return `user_${Date.now()}`;
}

/** 生成唯一用户名 */
async function uniqueUsername(
  env: Env,
  base: string
): Promise<string> {
  const db = getDB(env);
  let candidate = base;
  for (let i = 0; i < 10; i++) {
    const result = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.username, candidate));
    if (result[0].count === 0) return candidate;
    const suffix = new Uint8Array(3);
    crypto.getRandomValues(suffix);
    const encoded = btoa(String.fromCharCode(...suffix))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    candidate = `${base}_${encoded}`;
  }
  return candidate;
}

/** 获取或创建 stamp */
async function getOrCreateStamp(env: Env, userId: string): Promise<string> {
  const key = `stamp:${userId}`;
  const existing = await env.TOKEN_BLACKLIST.get(key);
  if (existing) return existing;
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const newStamp = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  await env.TOKEN_BLACKLIST.put(key, newStamp);
  return newStamp;
}

/** 解析 JWT 有效期为秒数 */
function parseJwtExpiration(expiration?: string): number {
  if (!expiration) return 86400;
  const match = expiration.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 86400;
  const value = parseInt(match[1], 10);
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * (multipliers[match[2]] ?? 1) || 86400;
}

// ── OAuth 提供商配置 ──────────────────────────────────────────────

function isGoogleEnabled(env: Env): boolean {
  return !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

function isGitHubEnabled(env: Env): boolean {
  return !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
}

function isProviderEnabled(env: Env, provider: string): boolean {
  switch (provider) {
    case "google": return isGoogleEnabled(env);
    case "github": return isGitHubEnabled(env);
    default: return false;
  }
}

// ── 核心服务函数 ──────────────────────────────────────────────────

/** 检查 OAuth 提供商是否启用 */
export function isEnabled(env: Env, provider: string): boolean {
  return isProviderEnabled(env, provider);
}

/** 生成 OAuth 授权 URL */
export function getAuthURL(env: Env, provider: string): string {
  const base = getCallbackBaseURL(env);
  const state = genState();

  switch (provider) {
    case "google": {
      const params = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        redirect_uri: `${base}/api/v1/auth/google/callback`,
        response_type: "code",
        scope: "openid email profile",
        state,
        prompt: "select_account",
        access_type: "online",
      });
      return `https://accounts.google.com/o/oauth2/auth?${params}`;
    }
    case "github": {
      const params = new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID,
        redirect_uri: `${base}/api/v1/auth/github/callback`,
        scope: "read:user user:email",
        state,
      });
      return `https://github.com/login/oauth/authorize?${params}`;
    }
    default:
      throw new Error(`未知提供商: ${provider}`);
  }
}

/** 处理 OAuth 回调 */
export async function handleCallback(
  env: Env,
  provider: string,
  code: string
): Promise<AuthResponse> {
  // 交换 token
  const oauthToken = await exchangeCode(env, provider, code);

  // 获取用户信息
  const profile = await fetchProfile(env, provider, oauthToken);

  // 查找或创建用户
  const user = await findOrCreateOAuthUser(env, provider, profile);

  if (user.status === "banned") {
    throw new Error("账号已被封禁");
  }

  // 生成 JWT
  const stamp = await getOrCreateStamp(env, user.id);
  const token = await generateAccessToken(
    env.JWT_SECRET, user.id, user.email, user.role, stamp, env.JWT_EXPIRATION
  );
  const refreshToken = await generateRefreshToken(
    env.JWT_SECRET, user.id + "refresh", user.email, user.role, stamp, env.JWT_REFRESH_EXPIRATION
  );

  // 更新登录信息
  const db = getDB(env);
  const now = nowISO();
  await db
    .update(users)
    .set({ lastLoginAt: now, loginFailCount: 0, status: "active", updatedAt: now })
    .where(eq(users.id, user.id));

  const expiresAt = new Date(
    Date.now() + parseJwtExpiration(env.JWT_EXPIRATION) * 1000
  ).toISOString();

  return {
    token,
    refresh_token: refreshToken,
    user: toUserInfo({ ...user, lastLoginAt: now, loginFailCount: 0, status: "active" }),
    expires_at: expiresAt,
  };
}

/** 交换授权码获取 OAuth token */
async function exchangeCode(
  env: Env,
  provider: string,
  code: string
): Promise<string> {
  const base = getCallbackBaseURL(env);

  switch (provider) {
    case "google": {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri: `${base}/api/v1/auth/google/callback`,
          grant_type: "authorization_code",
        }),
      });
      const data = await res.json() as { access_token?: string };
      if (!data.access_token) throw new Error("授权码交换失败");
      return data.access_token;
    }
    case "github": {
      const res = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          code,
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          redirect_uri: `${base}/api/v1/auth/github/callback`,
        }),
      });
      const data = await res.json() as { access_token?: string };
      if (!data.access_token) throw new Error("授权码交换失败");
      return data.access_token;
    }
    default:
      throw new Error(`未知提供商: ${provider}`);
  }
}

/** 获取 OAuth 用户信息 */
async function fetchProfile(
  env: Env,
  provider: string,
  accessToken: string
): Promise<OAuthProfile> {
  switch (provider) {
    case "google": {
      const res = await fetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = (await res.json()) as {
        sub: string; email: string; name: string; picture: string;
      };
      return {
        id: data.sub,
        email: data.email,
        username: data.name,
        name: data.name,
        avatarUrl: data.picture,
      };
    }
    case "github": {
      const res = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
        },
      });
      const data = (await res.json()) as {
        id: number; login: string; name: string;
        email: string; avatar_url: string;
      };
      let email = data.email;
      if (!email) {
        email = await fetchGitHubEmail(accessToken);
      }
      return {
        id: String(data.id),
        email,
        username: data.login,
        name: data.name,
        avatarUrl: data.avatar_url,
      };
    }
    default:
      throw new Error(`未知提供商: ${provider}`);
  }
}

/** GitHub 特殊处理：profile 无 email 时额外请求 /user/emails */
async function fetchGitHubEmail(accessToken: string): Promise<string> {
  try {
    const res = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    });
    const emails = (await res.json()) as Array<{
      email: string; primary: boolean; verified: boolean;
    }>;
    // 优先返回 primary + verified
    const primary = emails.find((e) => e.primary && e.verified);
    if (primary) return primary.email;
    // 其次返回任意 verified
    const verified = emails.find((e) => e.verified);
    if (verified) return verified.email;
    return "";
  } catch {
    return "";
  }
}

/** 三级匹配：查找或创建 OAuth 用户 */
async function findOrCreateOAuthUser(
  env: Env,
  provider: string,
  profile: OAuthProfile
): Promise<typeof users.$inferSelect> {
  const db = getDB(env);

  // 1. 通过 OAuth provider + ID 精确匹配
  const byOAuth = await db
    .select()
    .from(users)
    .where(
      and(eq(users.oauthProvider, provider), eq(users.oauthId, profile.id))
    )
    .limit(1);
  if (byOAuth.length > 0) {
    const user = byOAuth[0];
    // 更新头像
    if (profile.avatarUrl && user.avatarUrl !== profile.avatarUrl) {
      await db
        .update(users)
        .set({ avatarUrl: profile.avatarUrl, updatedAt: nowISO() })
        .where(eq(users.id, user.id));
      return { ...user, avatarUrl: profile.avatarUrl };
    }
    return user;
  }

  // 2. 通过 email 匹配（自动绑定 OAuth）
  if (profile.email) {
    const byEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, profile.email))
      .limit(1);
    if (byEmail.length > 0) {
      const user = byEmail[0];
      const now = nowISO();
      const updates: Record<string, string> = {
        oauthProvider: provider,
        oauthId: profile.id,
        emailVerifiedAt: now,
        status: "active",
        updatedAt: now,
      };
      if (profile.avatarUrl) updates.avatarUrl = profile.avatarUrl;
      await db.update(users).set(updates).where(eq(users.id, user.id));
      return { ...user, ...updates };
    }
  }

  // 3. 创建新用户
  let username = profile.username || baseUsernameFromEmail(profile.email);
  username = await uniqueUsername(env, username);

  const userId = generateUUID();
  const now = nowISO();
  const newUser = {
    id: userId,
    email: profile.email,
    passwordHash: "",
    username,
    role: "viewer",
    status: "active",
    avatarUrl: profile.avatarUrl,
    oauthProvider: provider,
    oauthId: profile.id,
    emailVerifiedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(users).values(newUser);
  return newUser as typeof users.$inferSelect;
}
