# SpaceLab 后端快速启动脚本

## Windows 用户

### 方案 1: 使用 PowerShell 脚本

```powershell
# 1. 复制环境配置
Copy-Item .env.example .env

# 2. 编辑配置（需要修改 JWT_SECRET 和 LIVECOMMENT_SITE_ID）
notepad .env

# 3. 启动数据库
docker-compose up -d postgres redis

# 4. 等待数据库就绪
Start-Sleep -Seconds 10

# 5. 运行后端
go run cmd/server/main.go
```

### 方案 2: 使用 Docker Compose

```powershell
# 复制环境配置
Copy-Item .env.example .env

# 编辑配置
notepad .env

# 一键启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

## Linux/Mac 用户

```bash
# 1. 复制环境配置
cp .env.example .env

# 2. 编辑配置
nano .env

# 3. 启动数据库
docker-compose up -d postgres redis

# 4. 等待数据库就绪
sleep 10

# 5. 运行后端
go run cmd/server/main.go
```

## 启动后验证

1. 访问后端 API
```bash
# 健康检查
curl http://localhost:8080/health

# 获取文章列表
curl http://localhost:8080/api/v1/posts
```

2. 前端开发
```bash
# 安装依赖（如未安装）
npm install

# 启动开发服务器
ng serve

# 访问 http://localhost:4200
```

## 常见问题

### Q: 数据库连接失败
```bash
# 检查 PostgreSQL 是否运行
docker ps

# 查看 PostgreSQL 日志
docker logs spacelab-postgres
```

### Q: Go 依赖下载失败
```bash
# 使用代理
go env -w GOPROXY=https://goproxy.cn,direct
go mod download
```

### Q: 前端无法连接后端
1. 检查后端是否运行：`http://localhost:8080/health`
2. 检查 CORS 配置
3. 检查 API URL 配置

### Q: 评论无法加载
1. 确认 LiveComment 站点 ID 已配置
2. 确认 LiveComment 服务可达

## 下一步

1. 配置 LiveComment 站点
2. 创建管理员账户
3. 测试文章管理功能
4. 配置生产环境部署

## 文档

- [完整部署指南](./backend/DEPLOY.md)
- [API 文档](./backend/docs/API.md)
- [项目结构](./backend/STRUCTURE.md)
