/**
 * 认证核心服务 — 对齐 Go 版 service/auth.go
 */
import { eq, and } from "drizzle-orm";
import { drizzle, DrizzleD1Database } from "drizzle-orm/d1";
import {
  users,
  siteSettings,
  emailVerificationTokens,
  passwordResetTokens,
  loginLogs,
  riskEvents,
} from "../db/schema";
import { generateAccessToken, generateRefreshToken, verifyToken } from "../utils/jwt";
import { hashPassword, verifyPassword } from "../utils/password";
import { generateUUID } from "../utils/uuid";
import { nowISO, isExpired } from "../utils/time";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "./email.service";

// ── 常量 ──────────────────────────────────────────────────────────

/** 常见弱密码列表 */
const COMMON_WEAK_PASSWORDS = new Set([
  "123456", "password", "12345678", "qwerty", "123456789", "12345",
  "1234", "111111", "1234567", "dragon", "123123", "baseball",
  "iloveyou", "trustno1", "sunshine", "master", "welcome", "shadow",
  "ashley", "football", "654321", "passw0rd", "abc123", "letmein",
  "admin", "login", "princess", "starwars", "1q2w3e4r", "1qaz2wsx",
  "zaq12wsx", "!qaz2wsx", "qazwsx", "1234567890", "112233", "123321",
  "abcdef", "abcdefg", "asdfgh", "asdfghjkl", "123qwe", "1q2w3e",
  "q1w2e3r4", "qwer1234",
]);

/** 用户名黑名单正则 */
const USERNAME_BLACKLIST =
  /(admin|root|system|moderator|官方|管理|客服|http|https|www|\.com|\.cn|\.net|<|>|script|on\w+=)/i;

/** 临时邮箱域名黑名单 */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "10minutemail.com", "mailinator.com", "guerrillamail.com",
  "guerrillamail.net", "guerrillamail.org", "guerrillamail.biz",
  "sharklasers.com", "grr.la", "yopmail.com", "yopmail.fr",
  "yopmail.net", "throwaway.email", "trashmail.com", "trashmail.net",
  "mailnator.com", "getnada.com", "temp-mail.org", "temp-mail.ru",
  "tempmail.email", "tempmail.net", "tempmail.org", "tempmail.eu",
  "maildrop.cc", "mailmetrash.com", "mailexpire.com", "mintemail.com",
  "spamgourmet.com", "spamspot.com", "spam.la", "emailondeck.com",
  "emailfake.com", "emailsilo.com", "dispostable.com", "throw-away.com",
  "mailcatch.com", "mailsac.com", "mailinator2.com", "mailtaxi.com",
  "mytemp.email", "mytrashmail.com", "quickinbox.com", "receivemails.com",
  "receivemail.org", "receive-sms-online.info", "reginamail.com",
  "safetymail.info", "shortmail.net", "slopsbox.com", "sofort-mail.de",
  "spambox.info", "spambox.us", "spamcannon.com", "spamdecoy.net",
  "spamex.com", "spamfighter.de", "spamfree24.org", "spamhole.com",
]);

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

// ── 类型 ──────────────────────────────────────────────────────────

export interface AuthResponse {
  token: string;
  refresh_token: string;
  user: UserInfo;
  expires_at: string;
}

export interface UserInfo {
  id: string;
  email: string;
  username: string;
  role: string;
  status: string;
  avatar_url: string;
  email_verified_at: string | null;
  created_at: string;
}

// ── 工具函数 ──────────────────────────────────────────────────────

function getDB(env: Env): DrizzleD1Database {
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

/** 生成随机 token（hex 编码） */
async function generateRandomToken(length: number): Promise<string> {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** SHA-256 哈希 */
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** 获取或创建安全 stamp */
async function getOrCreateStamp(env: Env, userId: string): Promise<string> {
  const key = `stamp:${userId}`;
  const existing = await env.TOKEN_BLACKLIST.get(key);
  if (existing) return existing;
  const newStamp = await generateRandomToken(16);
  await env.TOKEN_BLACKLIST.put(key, newStamp);
  return newStamp;
}

/** 轮换 stamp（使旧 token 失效） */
async function rotateStamp(env: Env, userId: string): Promise<string> {
  const newStamp = await generateRandomToken(16);
  await env.TOKEN_BLACKLIST.put(`stamp:${userId}`, newStamp);
  return newStamp;
}

/** 检查 stamp 是否已失效 */
async function isStampRevoked(env: Env, userId: string, stamp: string): Promise<boolean> {
  const storedStamp = await env.TOKEN_BLACKLIST.get(`stamp:${userId}`);
  if (storedStamp) {
    // 如果存储了 stamp，必须匹配
    return !stamp || storedStamp !== stamp;
  }
  // 无存储 stamp：如果传入也无 stamp，旧 token 向后兼容
  if (!stamp) return false;
  return false; // 有 stamp 但无存储，不撤销
}

/** 密码强度校验 */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return "password must be at least 8 characters";
  if (password.length > 128) return "password must be at most 128 characters";
  if (COMMON_WEAK_PASSWORDS.has(password.toLowerCase()))
    return "this password is too common, please choose a stronger one";

  let hasUpper = false, hasLower = false, hasDigit = false;
  for (const ch of password) {
    if (ch >= "A" && ch <= "Z") hasUpper = true;
    else if (ch >= "a" && ch <= "z") hasLower = true;
    else if (ch >= "0" && ch <= "9") hasDigit = true;
  }
  if (!hasUpper || !hasLower || !hasDigit)
    return "password must contain uppercase, lowercase, and numbers";
  return null;
}

/** HTML 转义 */
function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// ── 核心服务函数 ──────────────────────────────────────────────────

/** 检查是否开放注册 */
export async function isRegistrationOpen(env: Env): Promise<boolean> {
  const db = getDB(env);
  const result = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, "registration_open"))
    .limit(1);
  if (result.length === 0) return true; // 默认开放
  return result[0].value === "true" || result[0].value === "1";
}

/** 注册 */
export async function register(
  env: Env,
  input: { email: string; password: string; username: string }
): Promise<AuthResponse> {
  const db = getDB(env);

  // 检查注册是否开放
  if (!(await isRegistrationOpen(env))) {
    throw { status: 403, message: "registration is currently closed" };
  }

  // 邮箱格式校验
  if (!EMAIL_REGEX.test(input.email)) {
    throw { status: 400, message: "invalid email format" };
  }

  // 临时邮箱拦截
  const domain = input.email.split("@")[1]?.toLowerCase().trim();
  if (domain && DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    throw { status: 400, message: "disposable email addresses are not allowed" };
  }

  // 邮箱唯一性
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);
  if (existingUser.length > 0) {
    throw { status: 400, message: "email already registered" };
  }

  // 用户名校验
  const escaped = htmlEscape(input.username);
  if (escaped !== input.username || USERNAME_BLACKLIST.test(input.username)) {
    throw { status: 400, message: "username contains invalid content" };
  }
  if (input.username.length < 2 || input.username.length > 50) {
    throw { status: 400, message: "username must be between 2 and 50 characters" };
  }

  // 密码强度
  const pwdErr = validatePasswordStrength(input.password);
  if (pwdErr) throw { status: 400, message: pwdErr };

  // 密码哈希
  const passwordHash = await hashPassword(input.password, env.AUTH_MODE || "full");

  // 创建用户
  const userId = generateUUID();
  const createdAt = nowISO();
  await db.insert(users).values({
    id: userId,
    email: input.email,
    passwordHash,
    username: input.username,
    role: "viewer",
    status: "pending_verify",
    createdAt,
    updatedAt: createdAt,
  });

  // 发送邮箱验证邮件
  try {
    if (env.RESEND_API_KEY) {
      const rawToken = await generateRandomToken(32);
      const tokenHash = await sha256Hex(rawToken);
      const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

      // 撤销之前的未使用 token
      await db
        .update(emailVerificationTokens)
        .set({ used: true })
        .where(
          and(
            eq(emailVerificationTokens.userId, userId),
            eq(emailVerificationTokens.used, false)
          )
        );

      const tokenId = generateUUID();
      await db.insert(emailVerificationTokens).values({
        id: tokenId,
        userId,
        tokenHash,
        expiresAt,
        used: false,
        createdAt,
      });

      await sendVerificationEmail(env, input.email, rawToken);
    }
  } catch (e) {
    console.warn("Failed to send verification email:", e);
  }

  // 生成 JWT 双令牌
  const stamp = await getOrCreateStamp(env, userId);
  const token = await generateAccessToken(
    env.JWT_SECRET, userId, input.email, "viewer", stamp, env.JWT_EXPIRATION
  );
  const refreshToken = await generateRefreshToken(
    env.JWT_SECRET, userId + "refresh", input.email, "viewer", stamp, env.JWT_REFRESH_EXPIRATION
  );

  const expiresAt = new Date(
    Date.now() + (parseJwtExpiration(env.JWT_EXPIRATION) * 1000)
  ).toISOString();

  return {
    token,
    refresh_token: refreshToken,
    user: {
      id: userId,
      email: input.email,
      username: input.username,
      role: "viewer",
      status: "pending_verify",
      avatar_url: "",
      email_verified_at: null,
      created_at: createdAt,
    },
    expires_at: expiresAt,
  };
}

/** 登录 */
export async function login(
  env: Env,
  input: { email: string; password: string }
): Promise<AuthResponse> {
  const db = getDB(env);

  // 查找用户
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);
  if (result.length === 0) {
    throw { status: 401, message: "Invalid email or password" };
  }
  const user = result[0];

  // 检查用户状态
  switch (user.status) {
    case "banned":
      throw { status: 401, message: "Invalid email or password" };
    case "locked":
      if (user.lockedUntil && !isExpired(user.lockedUntil)) {
        throw { status: 401, message: "Invalid email or password" };
      }
      // 锁定已过期，自动解锁
      await db
        .update(users)
        .set({ status: "active", loginFailCount: 0, lockedUntil: "" })
        .where(eq(users.id, user.id));
      break;
    case "pending_verify":
      // 允许登录但返回状态让前端提示
      break;
  }

  // 验证密码
  let passwordValid = false;
  try {
    passwordValid = await verifyPassword(input.password, user.passwordHash || "", env.AUTH_MODE || "full");
  } catch {
    passwordValid = false;
  }

  if (!passwordValid) {
    // 密码错误，增加失败计数
    const newFailCount = user.loginFailCount + 1;
    const updates: Record<string, unknown> = { loginFailCount: newFailCount };
    if (newFailCount >= 5) {
      updates.status = "locked";
      updates.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    }
    await db.update(users).set(updates).where(eq(users.id, user.id));
    throw { status: 401, message: "Invalid email or password" };
  }

  // 登录成功，重置失败计数
  const now = nowISO();
  await db
    .update(users)
    .set({
      loginFailCount: 0,
      status: "active",
      lockedUntil: "",
      lastLoginAt: now,
    })
    .where(eq(users.id, user.id));

  // 生成 JWT 双令牌
  const stamp = await getOrCreateStamp(env, user.id);
  const token = await generateAccessToken(
    env.JWT_SECRET, user.id, user.email, user.role, stamp, env.JWT_EXPIRATION
  );
  const refreshToken = await generateRefreshToken(
    env.JWT_SECRET, user.id + "refresh", user.email, user.role, stamp, env.JWT_REFRESH_EXPIRATION
  );

  const expiresAt = new Date(
    Date.now() + (parseJwtExpiration(env.JWT_EXPIRATION) * 1000)
  ).toISOString();

  return {
    token,
    refresh_token: refreshToken,
    user: toUserInfo({ ...user, status: "active", lastLoginAt: now }),
    expires_at: expiresAt,
  };
}

/** 刷新令牌 */
export async function refreshToken(
  env: Env,
  refreshTokenStr: string
): Promise<AuthResponse> {
  // 验证 token
  let payload;
  try {
    payload = await verifyToken(refreshTokenStr, env.JWT_SECRET);
  } catch {
    throw { status: 401, message: "invalid refresh token" };
  }

  // 检查是否是 refresh token
  if (!payload.user_id.endsWith("refresh")) {
    throw { status: 401, message: "not a refresh token" };
  }

  const realUserId = payload.user_id.slice(0, -"refresh".length);

  // 检查 stamp
  if (await isStampRevoked(env, realUserId, payload.stamp)) {
    throw { status: 401, message: "refresh token has been revoked" };
  }

  // 查找用户
  const db = getDB(env);
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, realUserId))
    .limit(1);
  if (result.length === 0) {
    throw { status: 401, message: "user not found" };
  }
  const user = result[0];

  if (user.status === "banned") {
    throw { status: 403, message: "account has been banned" };
  }

  // 沿用当前 stamp 生成新 token 对
  const stamp = await getOrCreateStamp(env, realUserId);
  const token = await generateAccessToken(
    env.JWT_SECRET, user.id, user.email, user.role, stamp, env.JWT_EXPIRATION
  );
  const newRefreshToken = await generateRefreshToken(
    env.JWT_SECRET, user.id + "refresh", user.email, user.role, stamp, env.JWT_REFRESH_EXPIRATION
  );

  const expiresAt = new Date(
    Date.now() + (parseJwtExpiration(env.JWT_EXPIRATION) * 1000)
  ).toISOString();

  return {
    token,
    refresh_token: newRefreshToken,
    user: toUserInfo(user),
    expires_at: expiresAt,
  };
}

/** 登出：token 加入 KV 黑名单 */
export async function logout(
  env: Env,
  userId: string,
  tokenString: string
): Promise<void> {
  // 黑名单 TTL 与 refresh token 有效期一致，确保覆盖整个 refresh token 生命周期
  const blacklistTtlSeconds = parseJwtExpiration(env.JWT_REFRESH_EXPIRATION);

  // 将 token 加入黑名单
  await env.TOKEN_BLACKLIST.put(tokenString, "revoked", {
    expirationTtl: blacklistTtlSeconds,
  });

  // 记录到用户 token 集合（供兆底批量撤销）
  await env.TOKEN_BLACKLIST.put(
    `user_token:${userId}:${await sha256Hex(tokenString)}`,
    "1",
    { expirationTtl: blacklistTtlSeconds }
  );
}

/** 获取当前用户信息 */
export async function getMe(env: Env, userId: string): Promise<UserInfo> {
  const db = getDB(env);
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (result.length === 0) {
    throw { status: 404, message: "User not found" };
  }
  return toUserInfo(result[0]);
}

/** 更新个人资料 */
export async function updateProfile(
  env: Env,
  userId: string,
  input: { username?: string; avatar_url?: string }
): Promise<void> {
  const db = getDB(env);
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (result.length === 0) {
    throw { status: 404, message: "User not found" };
  }

  const updates: Record<string, string> = { updatedAt: nowISO() };

  if (input.username) {
    const escaped = htmlEscape(input.username);
    if (escaped !== input.username || USERNAME_BLACKLIST.test(input.username)) {
      throw { status: 400, message: "username contains invalid content" };
    }
    updates.username = input.username;
  }
  if (input.avatar_url) {
    updates.avatarUrl = input.avatar_url;
  }

  await db.update(users).set(updates).where(eq(users.id, userId));
}

/** 修改密码 */
export async function updatePassword(
  env: Env,
  userId: string,
  input: { old_password: string; new_password: string }
): Promise<void> {
  const db = getDB(env);
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (result.length === 0) {
    throw { status: 404, message: "User not found" };
  }
  const user = result[0];

  // 验证旧密码
  let oldPwdValid = false;
  try {
    oldPwdValid = await verifyPassword(
      input.old_password,
      user.passwordHash || "",
      env.AUTH_MODE || "full"
    );
  } catch {
    oldPwdValid = false;
  }
  if (!oldPwdValid) {
    throw { status: 401, message: "incorrect current password" };
  }

  // 新密码强度
  const pwdErr = validatePasswordStrength(input.new_password);
  if (pwdErr) throw { status: 400, message: pwdErr };

  // 哈希新密码
  const newHash = await hashPassword(input.new_password, env.AUTH_MODE || "full");
  await db.update(users).set({ passwordHash: newHash, updatedAt: nowISO() }).where(eq(users.id, userId));

  // 轮换 stamp，使旧 token 失效
  await rotateStamp(env, userId);
}

/** 请求密码重置 */
export async function requestPasswordReset(
  env: Env,
  email: string
): Promise<void> {
  const db = getDB(env);
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (result.length === 0) return; // 不暴露邮箱是否存在

  const user = result[0];
  const rawToken = await generateRandomToken(32);
  const tokenHash = await sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString(); // 1h

  // 撤销之前的未使用 token
  await db
    .update(passwordResetTokens)
    .set({ used: true })
    .where(
      and(
        eq(passwordResetTokens.userId, user.id),
        eq(passwordResetTokens.used, false)
      )
    );

  const tokenId = generateUUID();
  await db.insert(passwordResetTokens).values({
    id: tokenId,
    userId: user.id,
    tokenHash,
    expiresAt,
    used: false,
    createdAt: nowISO(),
  });

  // 发送邮件
  try {
    await sendPasswordResetEmail(env, email, rawToken);
  } catch (e) {
    console.error("Failed to send password reset email:", e);
  }
}

/** 重置密码 */
export async function resetPassword(
  env: Env,
  token: string,
  newPassword: string
): Promise<void> {
  // 密码强度
  const pwdErr = validatePasswordStrength(newPassword);
  if (pwdErr) throw { status: 400, message: pwdErr };

  const tokenHash = await sha256Hex(token);
  const db = getDB(env);

  const result = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        eq(passwordResetTokens.used, false)
      )
    )
    .limit(1);
  if (result.length === 0) {
    throw { status: 400, message: "invalid or expired token" };
  }
  const resetToken = result[0];

  if (isExpired(resetToken.expiresAt)) {
    throw { status: 400, message: "token expired" };
  }

  // 查找用户
  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.id, resetToken.userId))
    .limit(1);
  if (userResult.length === 0) {
    throw { status: 400, message: "user not found" };
  }
  const user = userResult[0];

  // 更新密码
  const newHash = await hashPassword(newPassword, env.AUTH_MODE || "full");
  await db.update(users).set({ passwordHash: newHash, updatedAt: nowISO() }).where(eq(users.id, user.id));

  // 标记 token 已使用
  await db
    .update(passwordResetTokens)
    .set({ used: true })
    .where(eq(passwordResetTokens.id, resetToken.id));

  // 轮换 stamp
  await rotateStamp(env, user.id);
}

/** 验证邮箱 */
export async function verifyEmail(env: Env, token: string): Promise<void> {
  const tokenHash = await sha256Hex(token);
  const db = getDB(env);

  const result = await db
    .select()
    .from(emailVerificationTokens)
    .where(
      and(
        eq(emailVerificationTokens.tokenHash, tokenHash),
        eq(emailVerificationTokens.used, false)
      )
    )
    .limit(1);
  if (result.length === 0) {
    throw { status: 400, message: "invalid or expired verification token" };
  }
  const verifyToken = result[0];

  if (isExpired(verifyToken.expiresAt)) {
    throw { status: 400, message: "verification token has expired, please request a new one" };
  }

  // 查找用户
  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.id, verifyToken.userId))
    .limit(1);
  if (userResult.length === 0) {
    throw { status: 400, message: "user not found" };
  }
  const user = userResult[0];

  if (user.emailVerifiedAt) {
    throw { status: 400, message: "email already verified" };
  }

  // 标记 token 已使用
  await db
    .update(emailVerificationTokens)
    .set({ used: true })
    .where(eq(emailVerificationTokens.id, verifyToken.id));

  // 更新用户状态
  const now = nowISO();
  await db
    .update(users)
    .set({ emailVerifiedAt: now, status: "active", updatedAt: now })
    .where(eq(users.id, user.id));
}

/** 重发验证邮件 */
export async function resendVerification(env: Env, userId: string): Promise<void> {
  const db = getDB(env);
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (result.length === 0) {
    throw { status: 400, message: "user not found" };
  }
  const user = result[0];

  if (user.emailVerifiedAt) {
    throw { status: 409, message: "email already verified" };
  }

  // 频率限制：1 分钟内不重发
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const recentResult = await db
    .select()
    .from(emailVerificationTokens)
    .where(
      and(
        eq(emailVerificationTokens.userId, userId),
        eq(emailVerificationTokens.used, false)
      )
    )
    .limit(1);
  if (recentResult.length > 0 && recentResult[0].createdAt > oneMinuteAgo) {
    throw {
      status: 429,
      message: "verification email sent recently, please wait before requesting again",
    };
  }

  if (!env.RESEND_API_KEY) {
    throw { status: 500, message: "email service not configured" };
  }

  // 生成新 token
  const rawToken = await generateRandomToken(32);
  const tokenHash = await sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

  // 撤销之前的未使用 token
  await db
    .update(emailVerificationTokens)
    .set({ used: true })
    .where(
      and(
        eq(emailVerificationTokens.userId, userId),
        eq(emailVerificationTokens.used, false)
      )
    );

  const tokenId = generateUUID();
  await db.insert(emailVerificationTokens).values({
    id: tokenId,
    userId,
    tokenHash,
    expiresAt,
    used: false,
    createdAt: nowISO(),
  });

  await sendVerificationEmail(env, user.email, rawToken);
}

/** 记录登录日志 */
export async function recordLoginLog(
  env: Env,
  userId: string,
  email: string,
  ip: string,
  userAgent: string,
  deviceInfo: string,
  success: boolean,
  failReason: string
): Promise<void> {
  try {
    const db = getDB(env);
    await db.insert(loginLogs).values({
      id: generateUUID(),
      userId: userId || "00000000-0000-0000-0000-000000000000",
      email,
      ip,
      userAgent,
      deviceInfo,
      success,
      failReason,
      loginAt: nowISO(),
    });
  } catch (e) {
    console.warn("Failed to record login log:", e);
  }
}

/** 记录风险事件 */
export async function recordRiskEvent(
  env: Env,
  userId: string,
  eventType: string,
  ip: string,
  userAgent: string,
  details: string
): Promise<void> {
  try {
    const db = getDB(env);
    await db.insert(riskEvents).values({
      id: generateUUID(),
      userId,
      eventType,
      ip,
      userAgent,
      details,
      createdAt: nowISO(),
    });
  } catch (e) {
    console.warn("Failed to record risk event:", e);
  }
}

/** 解析 JWT 有效期为秒数 */
function parseJwtExpiration(expiration?: string): number {
  if (!expiration) return 86400; // 默认 24h
  const match = expiration.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 86400;
  const value = parseInt(match[1], 10);
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * (multipliers[match[2]] ?? 1) || 86400;
}
