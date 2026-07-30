#!/usr/bin/env bash
# =============================================================================
# SpaceLab CF Worker 资源创建脚本
# 自动创建 D1 数据库、KV 命名空间、R2 存储桶，并输出需要填入 wrangler.toml 的 ID
# 用法: bash scripts/setup.sh
# =============================================================================

set -euo pipefail

echo "=========================================="
echo " SpaceLab CF Worker 资源创建"
echo "=========================================="
echo ""

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ─── 1. 创建 D1 数据库 ────────────────────────────────────────────────────────
echo -e "${YELLOW}[1/3] 创建 D1 数据库: spacelab-db${NC}"
D1_OUTPUT=$(wrangler d1 create spacelab-db 2>&1) || true
D1_ID=$(echo "$D1_OUTPUT" | grep -oP 'database_id = "\K[^"]+' || echo "NOT_FOUND")
echo -e "${GREEN}  → database_id: ${D1_ID}${NC}"
echo ""

# ─── 2. 创建 KV 命名空间 ──────────────────────────────────────────────────────
echo -e "${YELLOW}[2/3] 创建 KV 命名空间${NC}"

KV_TOKEN_OUTPUT=$(wrangler kv:namespace create TOKEN_BLACKLIST 2>&1) || true
KV_TOKEN_ID=$(echo "$KV_TOKEN_OUTPUT" | grep -oP 'id = "\K[^"]+' || echo "NOT_FOUND")
echo -e "${GREEN}  → TOKEN_BLACKLIST id: ${KV_TOKEN_ID}${NC}"

KV_RATE_OUTPUT=$(wrangler kv:namespace create RATE_LIMIT 2>&1) || true
KV_RATE_ID=$(echo "$KV_RATE_OUTPUT" | grep -oP 'id = "\K[^"]+' || echo "NOT_FOUND")
echo -e "${GREEN}  → RATE_LIMIT id: ${KV_RATE_ID}${NC}"

KV_CACHE_OUTPUT=$(wrangler kv:namespace create CACHE 2>&1) || true
KV_CACHE_ID=$(echo "$KV_CACHE_OUTPUT" | grep -oP 'id = "\K[^"]+' || echo "NOT_FOUND")
echo -e "${GREEN}  → CACHE id: ${KV_CACHE_ID}${NC}"
echo ""

# ─── 3. 创建 R2 存储桶 ───────────────────────────────────────────────────────
echo -e "${YELLOW}[3/3] 创建 R2 存储桶: spacelab-media${NC}"
wrangler r2 bucket create spacelab-media 2>&1 || echo "  (可能已存在)"
echo -e "${GREEN}  → bucket_name: spacelab-media${NC}"
echo ""

# ─── 输出汇总 ─────────────────────────────────────────────────────────────────
echo "=========================================="
echo " 请将以下 ID 填入 wrangler.toml"
echo "=========================================="
echo ""
echo "# D1 数据库"
echo "database_id = \"${D1_ID}\""
echo ""
echo "# KV 命名空间"
echo "TOKEN_BLACKLIST id = \"${KV_TOKEN_ID}\""
echo "RATE_LIMIT      id = \"${KV_RATE_ID}\""
echo "CACHE           id = \"${KV_CACHE_ID}\""
echo ""
echo "# R2 存储桶（无需 ID，bucket_name 已配置为 spacelab-media）"
echo ""
echo "=========================================="
echo " 接下来请设置 Secrets:"
echo "=========================================="
echo ""
echo "  wrangler secret put JWT_SECRET"
echo "  wrangler secret put GOOGLE_CLIENT_ID"
echo "  wrangler secret put GOOGLE_CLIENT_SECRET"
echo "  wrangler secret put GITHUB_CLIENT_ID"
echo "  wrangler secret put GITHUB_CLIENT_SECRET"
echo "  wrangler secret put GITHUB_TOKEN"
echo "  wrangler secret put RESEND_API_KEY"
echo "  wrangler secret put RESEND_FROM"
echo "  wrangler secret put TURNSTILE_SECRET_KEY"
echo ""
echo " 然后运行数据库迁移:"
echo "  npm run db:migrate        # 本地"
echo "  npm run db:migrate:prod   # 远程"
echo ""
echo " 最后部署:"
echo "  npm run deploy"
echo ""
