# SpaceLab CF Worker

Cloudflare Workers 后端，替代原 Go 后端（`backend/`），提供 API 服务、定时任务、OAuth 认证等全部功能。

## 技术栈

| 组件 | 说明 |
|------|------|
| **Runtime** | Cloudflare Workers |
| **Framework** | [Hono](https://hono.dev/) — 轻量 Web 框架 |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team/) — 类型安全 SQL ORM |
| **Database** | Cloudflare D1 — SQLite 兼容 |
| **Cache** | Cloudflare KV — 键值存储（Token 黑名单、速率限制、缓存） |
| **Storage** | Cloudflare R2 — 对象存储（媒体文件） |
| **Validation** | Zod — 运行时类型校验 |
| **Auth** | jose (JWT) + bcryptjs + OAuth 2.0 |

## 项目结构

```
cf-worker/
├── src/
│   ├── routes/          # API 路由
│   │   ├── auth.ts      # 认证（注册/登录/OAuth/JWT）
│   │   ├── posts.ts     # 文章 CRUD
│   │   ├── projects.ts  # 项目管理
│   │   ├── categories.ts # 分类
│   │   ├── tags.ts      # 标签
│   │   ├── admin.ts     # 管理后台
│   │   ├── ai-news.ts   # AI 新闻
│   │   ├── ai-tools.ts  # AI 工具
│   │   ├── friend-links.ts # 友链
│   │   ├── feed.ts      # RSS Feed
│   │   └── analytics.ts # 统计分析
│   ├── cron/            # 定时任务
│   │   ├── scheduled-publish.ts   # 定时发布
│   │   ├── cleanup-users.ts       # 清理未验证用户
│   │   ├── sync-ai-news.ts        # AI 新闻同步
│   │   ├── sync-lab-tools.ts      # AI 工具同步
│   │   ├── sync-github-projects.ts # GitHub 项目同步
│   │   └── daily-stats.ts         # 每日统计
│   ├── middleware/      # 中间件（CORS、认证、限流、安全头）
│   ├── services/        # 业务逻辑层
│   ├── db/              # 数据库 schema + 迁移
│   └── index.ts         # 入口（Hono app + Cron 调度）
├── scripts/
│   └── setup.sh         # 资源创建脚本
├── wrangler.toml        # CF Worker 配置
└── package.json
```

## 部署步骤

### 前置要求

- Node.js 22+
- Cloudflare 账号

### 1. 安装 Wrangler CLI

```bash
npm install -g wrangler
```

### 2. 登录 Cloudflare

```bash
wrangler login
```

### 3. 创建云资源（自动化）

运行一键创建脚本，自动创建 D1、KV、R2 并输出需要填入 `wrangler.toml` 的 ID：

```bash
bash scripts/setup.sh
```

或手动创建：

#### 3a. 创建 D1 数据库

```bash
wrangler d1 create spacelab-db
```

将返回的 `database_id` 填入 `wrangler.toml` 的 `database_id` 字段。

#### 3b. 创建 KV 命名空间（3 个）

```bash
wrangler kv:namespace create TOKEN_BLACKLIST
wrangler kv:namespace create RATE_LIMIT
wrangler kv:namespace create CACHE
```

将每个返回的 `id` 填入 `wrangler.toml` 对应的 `[[kv_namespaces]]` 块。

#### 3c. 创建 R2 存储桶

```bash
wrangler r2 bucket create spacelab-media
```

### 4. 设置 Secrets

通过 `wrangler secret put` 逐一设置（不会明文存储）：

```bash
wrangler secret put JWT_SECRET
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put GITHUB_TOKEN
wrangler secret put RESEND_API_KEY
wrangler secret put RESEND_FROM
wrangler secret put TURNSTILE_SECRET_KEY
```

### 5. 数据库迁移

```bash
# 本地开发环境
npm run db:migrate

# 远程生产环境
npm run db:migrate:prod
```

### 6. 运行种子数据

```bash
npm run db:seed
```

### 7. 部署

```bash
npm run deploy
```

## 环境变量说明

### 非敏感变量（`wrangler.toml` `[vars]`）

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `ENVIRONMENT` | `production` | 运行环境标识 |
| `JWT_EXPIRATION` | `24h` | Access Token 有效期 |
| `JWT_REFRESH_EXPIRATION` | `168h` | Refresh Token 有效期（7 天） |
| `AUTH_MODE` | `full` | 认证模式：`full`（OAuth + 密码）/ `oauth-only`（仅 OAuth） |

### Secrets（`wrangler secret put`）

| Secret | 说明 |
|--------|------|
| `JWT_SECRET` | JWT 签名密钥（建议 ≥ 32 字符随机字符串） |
| `GOOGLE_CLIENT_ID` | Google OAuth 客户端 ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 客户端密钥 |
| `GITHUB_CLIENT_ID` | GitHub OAuth 客户端 ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth 客户端密钥 |
| `GITHUB_TOKEN` | GitHub Personal Access Token（项目同步用） |
| `RESEND_API_KEY` | Resend 邮件服务 API Key |
| `RESEND_FROM` | 发件人地址（如 `noreply@yourdomain.com`） |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile 人机验证密钥 |

## 本地开发

```bash
# 启动本地开发服务器（热重载）
npm run dev

# 本地数据库迁移
npm run db:migrate

# 本地种子数据
npm run db:seed
```

本地开发时，Secrets 通过 `.dev.vars` 文件提供（参考 `.dev.vars.example`）。

## API 端点概览

| 路由前缀 | 说明 |
|----------|------|
| `GET /health` | 健康检查 |
| `/api/v1/auth/*` | 认证（注册、登录、OAuth、Token 刷新） |
| `/api/v1/posts/*` | 文章（CRUD、评论） |
| `/api/v1/projects/*` | 项目（CRUD） |
| `/api/v1/categories/*` | 分类 |
| `/api/v1/tags/*` | 标签 |
| `/api/v1/friend-links/*` | 友情链接 |
| `/api/v1/ai-news/*` | AI 新闻 |
| `/api/v1/ai-tools/*` | AI 工具 |
| `/api/v1/admin/*` | 管理后台（需 admin 角色） |
| `/api/v1/analytics/*` | 站点统计 |
| `/captcha/*` | Turnstile 验证 |
| `/feed` | RSS Feed |

## Cron 定时任务

| 表达式 | 任务 | 说明 |
|--------|------|------|
| `* * * * *` | 定时发布 | 每分钟检查待发布文章 |
| `0 3 * * *` | 清理未验证用户 | 每日凌晨 3:00 UTC |
| `17 */2 * * *` | AI 新闻同步 | 每 2 小时 |
| `21 */2 * * *` | AI 工具同步 | 每 2 小时 |
| `23 18 * * *` | GitHub 项目同步 | 每日 18:23 UTC |
| `0 0 * * *` | 每日统计 | 每日 00:00 UTC |

### 手动触发 Cron 任务

通过 GitHub Actions 手动触发（推荐）：

1. 进入 GitHub → Actions → **Deploy CF Worker**
2. 点击 **Run workflow**
3. 选择要触发的任务（如 `sync-ai-news`）
4. 点击 **Run workflow**

通过 Wrangler CLI 手动触发：

```bash
# 触发指定 cron 任务
wrangler trigger cron sync-ai-news
wrangler trigger cron sync-lab-tools
wrangler trigger cron sync-github-projects
wrangler trigger cron daily-stats
wrangler trigger cron cleanup-users
wrangler trigger cron scheduled-publish
```

## 降级策略

当 `AUTH_MODE` 设置为 `oauth-only` 时：

- 密码注册/登录接口被禁用，返回 `403`
- 仅保留 Google / GitHub OAuth 登录
- 适用于无法安全存储密码哈希的部署场景
- 已在 `wrangler.toml` 中通过 `AUTH_MODE = "full"` 默认启用完整模式

切换为降级模式：

```bash
# 修改 wrangler.toml 中的 vars
AUTH_MODE = "oauth-only"

# 重新部署
npm run deploy
```
