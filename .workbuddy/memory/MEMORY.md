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
