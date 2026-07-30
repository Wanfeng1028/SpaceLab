/**
 * 媒体上传路由 — 对齐 Go 版 handler/media/media.go
 */
import { Hono } from "hono";
import { eq, and, sql, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { AuthVariables } from "../middleware/auth";
import { authMiddleware } from "../middleware/auth";
import { mediaAssets } from "../db/schema";
import { generateUUID } from "../utils/uuid";
import { nowISO } from "../utils/time";

type AppContext = { Bindings: Env; Variables: AuthVariables };

const mediaRouter = new Hono<AppContext>();

// ── 常量 ──────────────────────────────────────────────────────────

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB

const VALID_MIME_TYPES: Record<string, boolean> = {
  "image/jpeg": true,
  "image/png": true,
  "image/gif": true,
  "image/webp": true,
  "video/mp4": true,
  "video/webm": true,
};

const VALID_EXTENSIONS: Record<string, boolean> = {
  ".jpg": true,
  ".jpeg": true,
  ".png": true,
  ".gif": true,
  ".webp": true,
  ".mp4": true,
  ".webm": true,
};

// ── 工具函数 ──────────────────────────────────────────────────────

/** 统一错误处理 */
function handleError(c: any, err: unknown) {
  if (err && typeof err === "object" && "status" in err && "message" in err) {
    const e = err as { status: number; message: string };
    return c.json({ error: e.message }, e.status);
  }
  console.error("Unexpected error:", err);
  return c.json({ error: "Internal Server Error" }, 500);
}

/** 获取 R2 公开访问基础 URL */
function getR2PublicUrl(env: Env): string {
  return env.R2_PUBLIC_URL || "https://pub-xxx.r2.dev";
}

/**
 * 通过 magic bytes 检测文件真实 MIME 类型
 */
function detectFileType(bytes: Uint8Array): string | null {
  if (bytes.length < 4) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  // GIF: GIF87a or GIF89a
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return "image/gif";
  }

  // WEBP: RIFF....WEBP
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  // MP4: ftyp box
  if (
    bytes.length >= 8 &&
    ((bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) ||
      (bytes.length >= 12 &&
        bytes[0] === 0x66 &&
        bytes[1] === 0x74 &&
        bytes[2] === 0x79 &&
        bytes[3] === 0x70))
  ) {
    return "video/mp4";
  }

  // WebM: 1A 45 DF A3
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    return "video/webm";
  }

  return null;
}

/**
 * 根据 MIME 类型获取媒体类别
 */
function getMediaType(mimeType: string): string {
  if (mimeType.startsWith("image/")) {
    if (mimeType === "image/gif") return "gif";
    return "image";
  }
  if (mimeType.startsWith("video/")) return "video";
  return "unknown";
}

/**
 * 获取文件扩展名
 */
function getExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  if (idx === -1) return "";
  return filename.slice(idx).toLowerCase();
}

// ── 公开路由 ──────────────────────────────────────────────────────

/**
 * GET / — 媒体列表
 * Go 版返回: { assets, total, page, page_size, total_pages }
 */
mediaRouter.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  const page = parseInt(c.req.query("page") || "1", 10);
  const pageSize = parseInt(c.req.query("page_size") || "20", 10);
  const type = c.req.query("type");

  const conditions: any[] = [];
  if (type) {
    conditions.push(eq(mediaAssets.type, type));
  }

  const whereClause =
    conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...conditions);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(mediaAssets)
    .where(whereClause);
  const total = countResult[0]?.count || 0;

  const offset = (Math.max(1, page) - 1) * pageSize;
  const assets = await db
    .select()
    .from(mediaAssets)
    .where(whereClause)
    .orderBy(desc(mediaAssets.createdAt))
    .limit(pageSize)
    .offset(offset);

  return c.json({
    assets,
    total,
    page,
    page_size: pageSize,
    total_pages: Math.ceil(total / pageSize),
  });
});

/**
 * GET /:id — 媒体详情
 * Go 版直接返回 mediaAsset 对象
 */
mediaRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = drizzle(c.env.DB);

  const result = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.id, id))
    .limit(1);

  if (result.length === 0) {
    return c.json({ error: "Media not found" }, 404);
  }

  return c.json(result[0]);
});

// ── 需要认证的路由 ────────────────────────────────────────────────

/**
 * POST /upload — 文件上传
 * Go 版返回: { id, url, name, type, size, mime_type } (201)
 */
mediaRouter.post("/upload", authMiddleware, async (c) => {
  const userId = c.get("userId");

  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return c.json({ error: "file is required" }, 400);
    }

    // 1. 大小限制
    if (file.size > MAX_UPLOAD_SIZE) {
      return c.json(
        {
          error: `File size exceeds maximum allowed size (${MAX_UPLOAD_SIZE} bytes)`,
        },
        400
      );
    }

    // 2. 扩展名白名单
    const ext = getExtension(file.name);
    if (!VALID_EXTENSIONS[ext]) {
      return c.json({ error: "Invalid file extension" }, 400);
    }

    // 3. MIME 白名单（客户端声明）
    const clientMime = file.type;
    if (!VALID_MIME_TYPES[clientMime]) {
      return c.json({ error: "Invalid file type" }, 400);
    }

    // 4. Magic bytes 验证（读取文件头部字节验证真实类型）
    const headerBuffer = await file.slice(0, 32).arrayBuffer();
    const headerBytes = new Uint8Array(headerBuffer);
    const detectedMime = detectFileType(headerBytes);

    if (!detectedMime || !VALID_MIME_TYPES[detectedMime]) {
      return c.json(
        { error: "File content does not match allowed types" },
        400
      );
    }

    // 5. UUID 重命名
    const uuid = generateUUID();
    const filename = `${uuid}${ext}`;
    const storagePath = `media/${filename}`;

    // 6. 上传到 R2
    await c.env.MEDIA_BUCKET.put(storagePath, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: detectedMime,
      },
    });

    // 7. 生成 URL（从环境变量读取 R2 公开访问地址）
    const baseUrl = getR2PublicUrl(c.env);
    const url = `${baseUrl}/${storagePath}`;

    // 8. 写入 D1 元数据
    const db = drizzle(c.env.DB);
    const now = nowISO();
    const assetId = generateUUID();

    await db.insert(mediaAssets).values({
      id: assetId,
      filename,
      originalName: file.name,
      storagePath,
      url,
      mimeType: detectedMime,
      size: file.size,
      type: getMediaType(detectedMime),
      uploadedBy: userId,
      createdAt: now,
    });

    return c.json(
      {
        id: assetId,
        url,
        name: file.name,
        type: getMediaType(detectedMime),
        size: file.size,
        mime_type: detectedMime,
      },
      201
    );
  } catch (err) {
    return handleError(c, err);
  }
});

/**
 * DELETE /:id — 文件删除
 */
mediaRouter.delete("/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");
  const role = c.get("role");
  const db = drizzle(c.env.DB);

  const result = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.id, id))
    .limit(1);

  if (result.length === 0) {
    return c.json({ error: "Media not found" }, 404);
  }

  const asset = result[0];

  // 权限检查：admin 或资源所有者
  if (asset.uploadedBy !== userId && role !== "admin") {
    return c.json({ error: "Permission denied" }, 403);
  }

  // 删除 R2 文件
  try {
    await c.env.MEDIA_BUCKET.delete(asset.storagePath);
  } catch (e) {
    console.warn("Failed to delete from R2:", e);
  }

  // 删除数据库记录
  await db.delete(mediaAssets).where(eq(mediaAssets.id, id));

  return c.json({ message: "Media deleted successfully" });
});

export { mediaRouter as mediaRoutes };
