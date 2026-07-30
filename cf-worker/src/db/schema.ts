import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ─── 1. users ───────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  username: text("username").notNull(),
  role: text("role").notNull().default("viewer"), // admin, writer, viewer
  status: text("status").notNull().default("active"), // active, pending_verify, locked, banned
  avatarUrl: text("avatar_url").default(""),
  oauthProvider: text("oauth_provider").default(""),
  oauthId: text("oauth_id").default(""),
  loginFailCount: integer("login_fail_count").notNull().default(0),
  lockedUntil: text("locked_until"),
  lastLoginAt: text("last_login_at"),
  lastLoginIp: text("last_login_ip").default(""),
  commentApprovedCount: integer("comment_approved_count").notNull().default(0),
  emailVerifiedAt: text("email_verified_at"),
  newsletterOptIn: integer("newsletter_opt_in", { mode: "boolean" }).notNull().default(false),
  newsletterOptInAt: text("newsletter_opt_in_at"),
  mailerliteSubscriberId: text("mailerlite_subscriber_id").default(""),
  newsletterUnsubscribedAt: text("newsletter_unsubscribed_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── 2. posts ───────────────────────────────────────────────
export const posts = sqliteTable("posts", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary").default(""),
  content: text("content").default(""),
  coverUrl: text("cover_url").default(""),
  category: text("category").default(""),
  tags: text("tags").default("[]"), // JSON stringified string[]
  readingTime: integer("reading_time").notNull().default(0),
  status: text("status").notNull().default("draft"), // draft, scheduled, published, archived
  language: text("language").notNull().default("zh-CN"),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id),
  publishedAt: text("published_at"),
  scheduledAt: text("scheduled_at"),
  viewCount: integer("view_count").notNull().default(0),
  commentsEnabled: integer("comments_enabled", { mode: "boolean" }).notNull().default(true),
  deletedAt: text("deleted_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── 3. comments ────────────────────────────────────────────
export const comments = sqliteTable("comments", {
  id: text("id").primaryKey(),
  contentType: text("content_type").notNull().default("post"), // post, project, page
  contentId: text("content_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  parentId: text("parent_id"), // self-ref, no FK constraint in SQLite for simplicity
  content: text("content").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected, spam
  ip: text("ip").default(""),
  ipLocation: text("ip_location").default(""),
  deletedAt: text("deleted_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── 4. projects ────────────────────────────────────────────
export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").default(""),
  content: text("content").default(""),
  coverUrl: text("cover_url").default(""),
  websiteUrl: text("website_url").default(""),
  githubUrl: text("github_url").default(""),
  language: text("language").default(""),
  tags: text("tags").default("[]"), // JSON stringified string[]
  features: text("features").default("[]"), // JSON stringified string[]
  technologies: text("technologies").default("[]"), // JSON stringified string[]
  status: text("status").notNull().default("published"), // draft, published, archived
  viewCount: integer("view_count").notNull().default(0),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id),
  publishedAt: text("published_at"),
  deletedAt: text("deleted_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── 5. media_assets ────────────────────────────────────────
export const mediaAssets = sqliteTable("media_assets", {
  id: text("id").primaryKey(),
  filename: text("filename").notNull(),
  originalName: text("original_name").default(""),
  storagePath: text("storage_path").notNull(),
  url: text("url").default(""),
  mimeType: text("mime_type").default(""),
  size: integer("size").notNull().default(0),
  width: integer("width"),
  height: integer("height"),
  duration: integer("duration"), // stored as integer (ms), nullable
  type: text("type").default(""), // image, gif, video, model
  altText: text("alt_text").default(""),
  uploadedBy: text("uploaded_by")
    .notNull()
    .references(() => users.id),
  createdAt: text("created_at").notNull(),
});

// ─── 6. analytics_events ────────────────────────────────────
export const analyticsEvents = sqliteTable("analytics_events", {
  id: text("id").primaryKey(),
  eventType: text("event_type").notNull(),
  pagePath: text("page_path").default(""),
  pageTitle: text("page_title").default(""),
  targetId: text("target_id"),
  targetType: text("target_type").default(""),
  referrer: text("referrer").default(""),
  deviceType: text("device_type").default(""),
  browser: text("browser").default(""),
  language: text("language").default(""),
  userAgent: text("user_agent").default(""),
  ipAddress: text("ip_address").default(""),
  country: text("country").default(""),
  city: text("city").default(""),
  sessionId: text("session_id").default(""),
  userId: text("user_id").default(""),
  duration: integer("duration").notNull().default(0),
  metadata: text("metadata").default("{}"), // JSON stringified
  createdAt: text("created_at").notNull(),
});

// ─── 7. categories ──────────────────────────────────────────
export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").default(""),
  icon: text("icon").default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  parentId: text("parent_id"), // self-ref
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── 8. tags ────────────────────────────────────────────────
export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  color: text("color").default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── 9. friend_links ────────────────────────────────────────
export const friendLinks = sqliteTable("friend_links", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  logoUrl: text("logo_url").default(""),
  description: text("description").default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  status: text("status").notNull().default("pending"), // pending, active, inactive
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── 10. login_logs ─────────────────────────────────────────
export const loginLogs = sqliteTable("login_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  email: text("email").notNull(),
  ip: text("ip").notNull(),
  userAgent: text("user_agent").default(""),
  deviceInfo: text("device_info").default(""),
  success: integer("success", { mode: "boolean" }).notNull().default(false),
  failReason: text("fail_reason").default(""),
  loginAt: text("login_at").notNull(),
});

// ─── 11. risk_events ────────────────────────────────────────
export const riskEvents = sqliteTable("risk_events", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  eventType: text("event_type").notNull(), // new_device, new_ip, brute_force, admin_login_fail, suspicious_activity
  ip: text("ip").default(""),
  userAgent: text("user_agent").default(""),
  details: text("details").default(""),
  resolved: integer("resolved", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});

// ─── 12. site_settings ──────────────────────────────────────
export const siteSettings = sqliteTable("site_settings", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull().default(""),
  updatedAt: text("updated_at").notNull(),
});

// ─── 13. email_verification_tokens ──────────────────────────
export const emailVerificationTokens = sqliteTable("email_verification_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  used: integer("used", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});

// ─── 14. password_reset_tokens ──────────────────────────────
export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  used: integer("used", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});

// ─── 15. admin_audit_logs ───────────────────────────────────
export const adminAuditLogs = sqliteTable("admin_audit_logs", {
  id: text("id").primaryKey(),
  adminId: text("admin_id").notNull(),
  adminName: text("admin_name").notNull(),
  action: text("action").notNull(), // create, update, delete, approve, reject, ban, unban, lock, unlock, reset_password, update_setting
  targetType: text("target_type").notNull(), // user, post, comment, friend_link, category, tag, setting
  targetId: text("target_id").default(""),
  details: text("details").default(""),
  ip: text("ip").default(""),
  userAgent: text("user_agent").default(""),
  createdAt: text("created_at").notNull(),
});

// ─── 16. sensitive_words ────────────────────────────────────
export const sensitiveWords = sqliteTable("sensitive_words", {
  id: text("id").primaryKey(),
  word: text("word").notNull().unique(),
  category: text("category").default(""), // profanity, spam, politics, ads
  createdAt: text("created_at").notNull(),
});

// ─── 17. comment_reports ────────────────────────────────────
export const commentReports = sqliteTable("comment_reports", {
  id: text("id").primaryKey(),
  commentId: text("comment_id")
    .notNull()
    .references(() => comments.id),
  reporterId: text("reporter_id")
    .notNull()
    .references(() => users.id),
  reason: text("reason").notNull(), // spam, harassment, inappropriate, other
  description: text("description").default(""),
  status: text("status").notNull().default("pending"), // pending, reviewed, dismissed
  reviewedBy: text("reviewed_by"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── 18. ai_news ────────────────────────────────────────────
export const aiNews = sqliteTable("ai_news", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary").default(""),
  content: text("content").default(""),
  sourceName: text("source_name").default(""),
  sourceUrl: text("source_url").default(""),
  category: text("category").default(""), // model, product, funding, opensource, agent, tool, industry
  tags: text("tags").default("[]"), // JSON stringified string[]
  imageUrl: text("image_url").default(""),
  status: text("status").notNull().default("draft"), // draft, published, archived
  publishedAt: text("published_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── 19. ai_tools ───────────────────────────────────────────
export const aiTools = sqliteTable("ai_tools", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary").default(""),
  category: text("category").default(""),
  source: text("source").default(""),
  url: text("url").default(""),
  tags: text("tags").default("[]"), // JSON stringified string[]
  publishedAt: text("published_at").default(""),
  fetchedAt: text("fetched_at").default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
