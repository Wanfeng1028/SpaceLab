# SpaceLab 后端服务

> 基于 Go + Gin 的现代化后端 API 服务，为 SpaceLab 前端提供完整的数据支持。

## 🚀 快速开始

### 前置条件
- Go 1.23+
- Docker & Docker Compose
- Node.js 18+（前端开发）

### 启动服务

```bash
# 1. 进入后端目录
cd backend

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，修改 JWT_SECRET 和 LIVECOMMENT_SITE_ID

# 3. 一键启动所有服务
docker-compose up -d

# 4. 访问 API
curl http://localhost:8080/health
```

### 开发模式

```bash
# 使用 Makefile
make dev

# 或直接运行
go run cmd/server/main.go
```

## 📦 项目结构

```
backend/
├── cmd/server/main.go        # 应用入口
├── internal/
│   ├── config/               # 配置管理
│   ├── handler/              # HTTP 处理器
│   ├── middleware/            # 中间件
│   ├── model/                # 数据模型
│   └── service/              # 业务逻辑
├── migrations/               # 数据库迁移
├── docs/                     # 文档
├── .env.example              # 环境配置模板
├── Dockerfile                # Docker 配置
├── docker-compose.yml        # 服务编排
├── Makefile                  # 构建命令
└── README.md                 # 本文件
```

## 🔧 技术栈

| 组件 | 技术 |
|------|------|
| **语言** | Go 1.23 |
| **框架** | Gin v1.10 |
| **ORM** | Gorm v1.25 |
| **数据库** | PostgreSQL 16 |
| **缓存** | Redis 7 |
| **认证** | JWT |
| **容器化** | Docker |
| **评论** | LiveComment |

## 📚 核心功能

### 用户认证
- ✅ 用户注册
- ✅ 用户登录
- ✅ JWT Token 验证
- ✅ 角色权限控制（Admin/Writer/Viewer）

### 文章管理
- ✅ 文章 CRUD
- ✅ 草稿/发布管理
- ✅ 阅读量统计
- ✅ 多语言支持

### 媒体上传
- ✅ 图片上传（jpg, png, gif, webp）
- ✅ 视频上传（mp4, webm）
- ✅ 文件大小限制
- ✅ 类型验证

### 评论系统
- ✅ LiveComment 集成
- ✅ 评论回复
- ✅ 评论审核
- ✅ 垃圾过滤

### 访问分析
- ✅ 事件记录
- ✅ 流量统计
- ✅ 热门文章
- ✅ 趋势分析

## 🔐 API 接口

### 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/auth/register` | 用户注册 |
| POST | `/api/v1/auth/login` | 用户登录 |
| GET | `/api/v1/auth/me` | 获取当前用户 |

### 文章
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/posts` | 文章列表 |
| GET | `/api/v1/posts/:slug` | 文章详情 |
| POST | `/api/v1/posts` | 创建文章 |
| PUT | `/api/v1/posts/:id` | 更新文章 |
| DELETE | `/api/v1/posts/:id` | 删除文章 |
| POST | `/api/v1/posts/:id/publish` | 发布文章 |

### 评论（LiveComment）
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/posts/:post_id/comments` | 获取评论 |
| POST | `/api/v1/posts/:post_id/comments` | 创建评论 |

### 媒体
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/media/upload` | 上传文件 |
| GET | `/api/v1/media` | 媒体列表 |

### 分析
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/analytics/summary` | 统计概览 |
| GET | `/api/v1/analytics/top-posts` | 热门文章 |
| GET | `/api/v1/analytics/traffic` | 流量趋势 |

## 🐳 Docker 部署

### 一键启动
```bash
docker-compose up -d
```

### 查看日志
```bash
docker-compose logs -f
```

### 停止服务
```bash
docker-compose down
```

### 数据备份
```bash
docker exec spacelab-postgres pg_dump -U spacelab spacelab > backup.sql
```

## 🛠️ 开发指南

### 添加新 API
1. 在 `internal/handler/` 创建处理器
2. 在 `internal/service/` 添加业务逻辑
3. 在 `internal/model/` 定义数据模型
4. 在 `cmd/server/main.go` 注册路由

### 数据库迁移
```bash
# 创建迁移文件
migrate create -ext sql -dir migrations -seq add_new_table

# 运行迁移
migrate -path migrations -database postgres://... up
```

### 运行测试
```bash
make test
# 或
go test ./...
```

## 📖 文档

- [完整 API 文档](./docs/API.md)
- [部署指南](./DEPLOY.md)
- [项目结构](./STRUCTURE.md)
- [快速开始](./QUICKSTART.md)

## 🔒 安全配置

### 生产环境必须修改
```env
# 生成强随机密钥
JWT_SECRET=<至少 32 字符的随机字符串>

# 启用 HTTPS
ALLOWED_ORIGINS=https://yourdomain.com

# 数据库加密
DATABASE_URL=postgres://...?sslmode=require
```

### 建议的安全措施
- 使用 HTTPS
- 配置防火墙
- 定期备份数据库
- 启用日志审计
- 限制文件上传大小
- 配置 CORS 白名单

## 📊 性能优化

### 数据库优化
- 添加索引
- 使用连接池
- 定期清理旧数据

### 缓存策略
- Redis 缓存热门数据
- API 响应缓存
- 静态资源 CDN

### 监控指标
- 请求响应时间
- 数据库连接数
- 错误率
- 资源使用情况

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📝 版本历史

### v1.0.0 (当前)
- ✅ 基础用户认证
- ✅ 文章管理
- ✅ LiveComment 评论集成
- ✅ 媒体上传
- ✅ 访问分析
- ✅ Docker 部署

### v0.1.0 (计划)
- [ ] 项目管理系统
- [ ] 画廊功能
- [ ] 邮件通知
- [ ] Webhook 支持

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE)

## 🙏 致谢

- [Gin Web Framework](https://github.com/gin-gonic/gin)
- [Gorm](https://gorm.io/)
- [PostgreSQL](https://www.postgresql.org/)
- [Docker](https://www.docker.com/)
- [LiveComment](https://livecomment.cn)

## 📞 联系方式

- GitHub: [SpaceLab Repository](https://github.com/Wanfeng1028/SpaceLab)
- Issues: [GitHub Issues](https://github.com/Wanfeng1028/SpaceLab/issues)
