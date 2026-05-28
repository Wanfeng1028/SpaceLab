# Backend Plan — SpaceLab

> SpaceLab 采用 **Content as Code** 策略，分阶段演进内容管理方案。

---

## Phase 1 — Static Content Layer ✅ 当前方案

**部署目标：** GitHub Pages
**内容管理：** Markdown / JSON 文件 + 构建脚本
**零服务器、零数据库、零 Azure 消耗**

### 架构

```
src/content/            ← 人工编辑的内容源
  posts/*.md            ← Markdown 文章（含 frontmatter）
  projects/projects.json
  profile.json
  site.json
  gallery.json

scripts/build-content.mjs   ← 构建时解析，生成 TS
src/generated/content.generated.ts  ← Angular 直接导入

.github/workflows/deploy.yml  ← push to main → GitHub Pages
```

### 工作流

1. `npm run new:post "标题"` → 生成 Markdown 模板
2. 编辑 Markdown，设置 `published: true`
3. `git push` → GitHub Actions 自动 build + deploy
4. 文章上线

### 当前不启用

- ❌ 用户登录
- ❌ 评论系统
- ❌ 点赞
- ❌ 数据库
- ❌ Azure VM / 常驻后端
- ❌ 在线 Admin 后台
- ❌ 文件上传（图片等静态资源直接放 `public/` 或 `src/assets/`）

---

## Phase 2 — Azure Functions + Blob Storage（未来可选）

**适用场景：** 需要联系表单、轻量 API、大文件存储时

### 可选功能

| 功能 | Azure 服务 | 说明 |
|------|-----------|------|
| 联系表单 | Azure Functions (HTTP trigger) | 无服务器函数，接收表单 → 转发邮件 |
| 图片/视频 CDN | Azure Blob Storage + CDN | 大文件托管，前端引用 Blob URL |
| GLB/3D 模型 | Azure Blob Storage | Three.js 场景加载远程模型 |
| 构建触发 | Azure Functions (GitHub Webhook) | 内容变更自动触发 rebuild |

### 成本估算

- Azure Functions Consumption Plan：每月 100 万次免费调用
- Blob Storage：5 GB 免费（学生账号）
- 不需要 VM、不需要常驻服务

---

## Phase 3 — Database / CMS / Analytics（未来远期）

**适用场景：** 需要动态内容管理、用户互动、数据分析时

### 可选方案

| 功能 | 方案 | 说明 |
|------|------|------|
| 评论系统 | Supabase / Disqus / Giscus | Giscus 基于 GitHub Discussions，零成本 |
| 访问统计 | Supabase + 自建 / Umami | 隐私友好的访问分析 |
| CMS 后台 | Supabase + 自建 Admin | 站长登录后管理文章/项目 |
| 搜索 | Algolia DocSearch / Pagefind | 静态站全文搜索 |
| 国际化内容 | i18n + 动态路由 | 中英文文章分别管理 |

### 数据库选型（如果需要）

- **Supabase (PostgreSQL)**：免费额度大，自带 Auth/Storage/Realtime
- **Azure SQL**：学生账号 $100 额度内可用
- **PlanetScale / Neon**：Serverless MySQL/PostgreSQL，有免费层

---

## 安全原则（贯穿所有阶段）

1. 不在前端代码中写入任何 Token / Key / Secret
2. `.env` 文件不提交到 Git
3. GitHub Pages 不依赖任何私密服务器
4. 如需 API Key，仅在 GitHub Actions Secrets 或 Azure Functions 环境变量中配置
5. `.env.example` 仅作模板参考，不含真实密钥
