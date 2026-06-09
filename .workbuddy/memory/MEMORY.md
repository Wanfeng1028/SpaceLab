# SpaceLab 项目记忆

## 2026-06-09 后端服务开发

### 已完成

1. **完整 Go 后端服务** - 基于 Gin 框架，包含用户认证、文章管理、媒体上传、访问分析等核心功能
2. **LiveComment 评论集成** - 使用开源评论系统，替代自研方案，减少维护成本
3. **Docker 部署配置** - 一键部署 PostgreSQL、Redis、后端服务
4. **前端组件开发** - Angular LiveComment 评论组件，支持回复、点赞、分页

### 技术选型

- 后端：Go 1.23 + Gin + Gorm + PostgreSQL
- 前端：Angular 21 + SCSS
- 评论系统：LiveComment（开源）
- 部署：Docker + Docker Compose

### 核心 API

- 认证：注册、登录、Token 验证
- 文章：CRUD、发布、草稿、阅读统计
- 媒体：上传、管理、类型验证
- 分析：事件记录、流量统计、趋势数据
- 评论：集成 LiveComment API

### 配置要求

后端环境变量：
- `DATABASE_URL` - PostgreSQL 连接字符串
- `JWT_SECRET` - JWT 加密密钥
- `LIVECOMMENT_SITE_ID` - LiveComment 站点 ID
- `SERVER_PORT` - 服务端口
- `MAX_UPLOAD_SIZE` - 最大上传大小

前端环境变量：
- `apiUrl` - 后端 API 地址

### 部署步骤

1. 配置 `.env` 文件
2. 运行 `docker-compose up -d`
3. 访问 `http://localhost:8080`

### 后续工作

- 单元测试
- API 文档完善
- CI/CD 配置
- 性能监控

---

## 2026-06-09 前端管理面板开发

### 已完成

1. **登录页面** - `/login` 邮箱/密码登录
2. **注册页面** - `/register` 用户注册
3. **认证服务** - AuthService 用户认证管理
4. **路由守卫** - AdminGuard 权限控制
5. **HTTP 拦截器** - 自动添加 Token
6. **管理面板** - `/admin` 文章管理、统计卡片
7. **文章编辑** - `/admin/write` 新建/编辑文章

### 文件清单

认证相关：
- `src/app/core/services/auth.service.ts`
- `src/app/core/guards/admin.guard.ts`
- `src/app/core/interceptors/auth.interceptor.ts`

页面组件：
- `src/app/features/auth/login.component.ts`
- `src/app/features/auth/register.component.ts`
- `src/app/features/admin/admin.component.ts`
- `src/app/features/admin/write/write.component.ts`

### 使用说明

- 登录: http://localhost:4200/login
- 注册: http://localhost:4200/register
- 管理后台: http://localhost:4200/admin

### 权限说明

- admin: 管理员，所有权限
- writer: 作者，可创建编辑文章
- viewer: 普通用户，只读

---

## 2026-06-09 一键管理脚本

### 已完成

1. **manage.ps1** - PowerShell 一键管理脚本，替代原有的 .cmd 文件
   - 启动：`.\manage.ps1 start` — 启动前端 + Docker 后端
   - 停止：`.\manage.ps1 stop` — 停止所有服务
   - 状态：`.\manage.ps1 status` — 查看端口和进程状态
   - 特性：UTF-8 编码，无乱码，智能端口检测，Docker 自动等待

2. **MANAGE_README.md** - 使用说明文档

### 解决的主要问题

- 原有 .cmd 文件在 PowerShell 中运行出现乱码
- 需要 cmd.exe 环境才能正常解析批处理语法
- 新脚本原生支持 PowerShell 7+，完美解决编码问题

### 端口列表

- 4200 - 前端 Angular dev server
- 8080 - 后端 Gin API
- 5432 - PostgreSQL
- 6379 - Redis

---

## 2026-06-09 一键启动/停止脚本

### 已完成

创建了**两个独立脚本**（不再使用 manage.ps1）：

1. **start-all.ps1** — 一键启动所有服务
   - 运行：`.\start-all.ps1`
   - 启动顺序：依赖检查 → Docker 后端 → 前端 ng serve

2. **stop-all.ps1** — 一键停止所有服务
   - 运行：`.\stop-all.ps1`
   - 停止内容：前端进程 + Docker 容器 + Go 后端

### 覆盖的端口

| 端口 | 服务 |
|------|------|
| 4200 | 前端 (ng serve) |
| 8080 | 后端 API |
| 5432 | PostgreSQL |
| 6379 | Redis |

### 脚本特性

- 原生 PowerShell 脚本，UTF-8 编码，无乱码
- 启动时自动检查端口占用、环境依赖
- Docker 容器启动后自动等待服务就绪
- 停止时智能查找并关闭前端/Docker/Go 进程
