# SpaceLab 部署指南

## 快速开始

### 1. 前置条件

- Docker 20.10+
- Docker Compose 2.0+
- Go 1.23+（本地开发）
- Node.js 18+（前端开发）

### 2. 克隆项目

```bash
git clone https://github.com/Wanfeng1028/SpaceLab.git
cd SpaceLab
```

### 3. 配置环境变量

#### 后端配置

```bash
cd backend
cp .env.example .env
# 编辑 .env 文件
```

需要修改的配置：

```env
# 数据库（必须设置，使用强密码）
DATABASE_URL=postgres://spacelab:<strong_password>@localhost:5432/spacelab?sslmode=require

# JWT（生产环境必须修改）
JWT_SECRET=<生成强随机密钥>

# LiveComment（在 https://livecomment.cn 注册获取）
LIVECOMMENT_SITE_ID=<your-livecomment-site-id>

# 服务器端口（可选，默认 8080）
SERVER_PORT=8080

# 前端 API 地址
ALLOWED_ORIGINS=http://localhost:4200,http://localhost:8080
```

#### 前端配置

```bash
# 开发环境
vim src/environments/environment.ts
```

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api/v1'
};
```

### 4. 启动服务

#### 方案 A：Docker Compose（推荐）

```bash
cd backend
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

#### 方案 B：本地开发

```bash
# 启动数据库
docker-compose up -d postgres redis

# 等待数据库初始化
sleep 5

# 运行后端
go run cmd/server/main.go

# 前端（另一终端）
ng serve
```

### 5. 验证服务

```bash
# 健康检查
curl http://localhost:8080/health

# API 测试
curl http://localhost:8080/api/v1/posts
```

## 开发指南

### 数据库迁移

```bash
# 进入数据库容器
docker exec -it spacelab-postgres psql -U spacelab -d spacelab

# 执行迁移脚本
\i /docker-entrypoint-initdb.d/001_initial_schema.sql
```

### 创建管理员账户

```sql
-- 密码通过 API 注册创建（不要直接在数据库中硬编码密码）
-- 使用以下 curl 命令创建管理员账户：
-- curl -X POST http://localhost:8080/api/v1/auth/register \
--   -H "Content-Type: application/json" \
--   -d '{"email":"admin@spacelab.com","password":"<strong_password>","username":"Administrator"}'
-- 然后通过 SQL 修改角色：
UPDATE users SET role = 'admin' WHERE email = 'admin@spacelab.com';
```

### API 测试示例

#### 注册
```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "username": "testuser"
  }'
```

#### 登录
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@spacelab.com",
    "password": "admin123"
  }'
```

响应：
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "admin@spacelab.com",
    "username": "Administrator",
    "role": "admin"
  },
  "expires_at": "2026-06-10T14:00:00Z"
}
```

#### 获取文章列表
```bash
curl http://localhost:8080/api/v1/posts?page=1&page_size=10
```

## 生产部署

### 1. 环境变量配置

```bash
# 生产环境必须修改
JWT_SECRET=<生成强随机密钥>
LIVECOMMENT_SITE_ID=<生产环境站点 ID>
DATABASE_URL=<生产数据库连接，必须启用 sslmode=require>
RESEND_API_KEY=<Resend API Key>
ENVIRONMENT=production
```

### 2. 构建生产镜像

```bash
docker-compose -f docker-compose.yml up -d --build
```

### 3. 数据库备份

```bash
# 备份
docker exec spacelab-postgres pg_dump -U spacelab spacelab > backup.sql

# 恢复
docker exec -i spacelab-postgres psql -U spacelab < backup.sql
```

### 4. 更新服务

```bash
# 拉取最新代码
git pull

# 重新构建
docker-compose up -d --build
```

## 常见问题

### Q: 数据库连接失败
**A:** 检查 `DATABASE_URL` 配置，确保 PostgreSQL 服务正在运行

### Q: JWT 验证失败
**A:** 检查 `JWT_SECRET` 是否一致，确认 Token 未过期

### Q: 评论无法加载
**A:** 检查 `LIVECOMMENT_SITE_ID` 是否正确配置

### Q: 文件上传失败
**A:** 检查 `MAX_UPLOAD_SIZE` 配置和 `UPLOAD_PATH` 目录权限

### Q: CORS 错误
**A:** 更新 `ALLOWED_ORIGINS` 包含前端地址

## 监控与维护

### 日志查看

```bash
# 所有服务
docker-compose logs -f

# 单个服务
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f redis
```

### 数据库维护

```bash
# 清理旧数据
docker exec spacelab-postgres psql -U spacelab -d spacelab \
  -c "DELETE FROM analytics_events WHERE created_at < NOW() - INTERVAL '90 days';"

# 优化表
docker exec spacelab-postgres psql -U spacelab -d spacelab \
  -c "VACUUM ANALYZE;"
```

## 资源

- [API 文档](./docs/api.md)
- [LiveComment 集成](../docs/live-comment-integration.md)
- [开发规范](../docs/DEVELOPMENT.md)
- [设计文档](../docs/DESIGN.md)

## 技术支持

如有问题，请：
1. 查看日志：`docker-compose logs`
2. 检查配置：`.env` 文件
3. 查阅文档：`docs/` 目录
4. 提交 Issue：GitHub Issues
