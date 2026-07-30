-- 002_rate_limit_d1.sql - D1 限流表（替代 KV 非原子操作）
-- 使用 D1 事务实现原子递增，解决竞态条件

CREATE TABLE IF NOT EXISTS rate_limit_counters (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  window_end TEXT NOT NULL,
  locked_until TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_window_end ON rate_limit_counters(window_end);
