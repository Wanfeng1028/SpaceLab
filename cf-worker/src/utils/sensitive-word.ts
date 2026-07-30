/**
 * 敏感词检查器 — 对齐 Go 版 utils/sensitive_word.go
 */
import { eq, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { sensitiveWords } from "../db/schema";
import { generateUUID } from "./uuid";
import { nowISO } from "./time";

/**
 * 敏感词检查器类
 * 从 D1 加载敏感词到内存 Set，提供快速匹配
 */
export class SensitiveWordChecker {
  private words: Map<string, string> = new Map(); // word -> category
  private loaded = false;

  /**
   * 从 D1 重新加载敏感词
   */
  async reload(env: Env): Promise<void> {
    try {
      const db = drizzle(env.DB);
      const result = await db.select().from(sensitiveWords).all();
      const newWords = new Map<string, string>();
      for (const w of result) {
        newWords.set(w.word.toLowerCase(), w.category || "");
      }
      this.words = newWords;
      this.loaded = true;
    } catch (e) {
      console.warn("Failed to load sensitive words:", e);
    }
  }

  /**
   * 确保已加载（懒加载）
   */
  private async ensureLoaded(env: Env): Promise<void> {
    if (!this.loaded) {
      await this.reload(env);
    }
  }

  /**
   * 检查内容是否包含敏感词
   * @returns true 表示命中
   */
  async check(env: Env, text: string): Promise<boolean> {
    await this.ensureLoaded(env);
    const lower = text.toLowerCase();
    for (const word of this.words.keys()) {
      if (lower.includes(word)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 检查内容是否包含敏感词，返回命中的分类
   * @returns [hit, category]
   */
  async checkWithCategory(
    env: Env,
    text: string
  ): Promise<[boolean, string]> {
    await this.ensureLoaded(env);
    const lower = text.toLowerCase();
    for (const [word, category] of this.words.entries()) {
      if (lower.includes(word)) {
        return [true, category];
      }
    }
    return [false, ""];
  }

  /**
   * 强制重新加载（添加/删除敏感词后调用）
   */
  async invalidate(): Promise<void> {
    this.loaded = false;
  }
}

// 全局单例
export const globalSensitiveChecker = new SensitiveWordChecker();
