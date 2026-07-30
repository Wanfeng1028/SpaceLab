/**
 * 审计日志服务 — 对齐 Go 版 utils/audit.go
 */
import { drizzle } from "drizzle-orm/d1";
import { adminAuditLogs } from "../db/schema";
import { generateUUID } from "../utils/uuid";
import { nowISO } from "../utils/time";

/**
 * 记录管理员操作审计日志
 */
export async function logAudit(
  env: Env,
  adminId: string,
  adminName: string,
  action: string,
  targetType: string,
  targetId: string,
  details: Record<string, unknown> | null,
  ip: string,
  userAgent: string
): Promise<void> {
  try {
    const db = drizzle(env.DB);
    await db.insert(adminAuditLogs).values({
      id: generateUUID(),
      adminId,
      adminName,
      action,
      targetType,
      targetId: targetId || "",
      details: details ? JSON.stringify(details) : "",
      ip: ip || "",
      userAgent: userAgent || "",
      createdAt: nowISO(),
    });
  } catch (e) {
    console.warn("Failed to write audit log:", e);
  }
}
