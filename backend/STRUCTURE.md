# 项目结构

```
backend/
├── cmd/
│   └── server/
│       └── main.go                 # 应用入口
├── internal/
│   ├── config/
│   │   ├── config.go              # 配置加载
│   │   └── database.go            # 数据库连接
│   ├── handler/
│   │   ├── auth/
│   │   │   └── auth.go            # 认证接口
│   │   ├── post/
│   │   │   └── post.go            # 文章接口
│   │   ├── comment/
│   │   │   └── comment.go         # LiveComment 集成
│   │   ├── media/
│   │   │   └── media.go           # 媒体上传
│   │   └── analytics/
│   │       └── analytics.go       # 分析接口
│   ├── middleware/
│   │   ├── auth.go                # JWT 认证
│   │   ├── security.go            # 安全中间件
│   │   └── rate_limit.go          # 限流（预留）
│   ├── model/
│   │   └── models.go              # 数据模型
│   ├── service/
│   │   ├── auth.go                # 认证业务
│   │   ├── post.go                # 文章业务
│   │   └── comment.go             # 评论业务（预留）
│   └── utils/
│       └── (工具函数)
├── migrations/
│   └── 001_initial_schema.sql     # 数据库迁移
├── docs/
│   ├── API.md                     # API 文档
│   └── (其他文档)
├── uploads/                        # 文件上传目录（运行时生成）
├── .env.example                   # 环境配置模板
├── .env                           # 环境配置（不提交）
├── go.mod                         # Go 模块定义
├── go.sum                         # 依赖锁定
├── Dockerfile                     # Docker 构建配置
├── docker-compose.yml             # 服务编排
└── README.md                      # 项目说明
```

## 目录说明

### `cmd/server/`
应用程序入口点，包含 `main()` 函数和服务器初始化逻辑。

### `internal/`
私有包，外部无法导入。

#### `config/`
配置管理：
- 环境变量加载
- 数据库连接
- 配置验证

#### `handler/`
HTTP 处理器，负责：
- 解析请求
- 调用服务层
- 返回响应
- 错误处理

#### `middleware/`
中间件：
- CORS 处理
- JWT 认证
- 权限检查
- 安全头
- 限流（预留）

#### `model/`
数据模型定义：
- 数据库表结构
- JSON 序列化
- 验证规则

#### `service/`
业务逻辑层：
- 认证逻辑
- 文章 CRUD
- 文件处理
- 数据分析

### `migrations/`
数据库迁移脚本，按顺序执行：
- 001_initial_schema.sql - 初始表结构

### `uploads/`
文件上传存储目录，结构：
```
uploads/
└── 2024/
    └── 06/
        └── 1723456789-image.jpg
```

### `docs/`
项目文档：
- API 文档
- 部署指南
- 开发规范

## 命名约定

### 文件名
- 使用 snake_case（如 `auth_handler.go`）
- 主文件命名与包名一致

### 函数名
- 使用 PascalCase（如 `GetComments`, `CreatePost`）
- 导出函数首字母大写

### 变量名
- 使用 camelCase（如 `accessToken`, `userRole`）
- 私有变量首字母小写

### 常量名
- 使用 SCREAMING_SNAKE_CASE（如 `MaxUploadSize`, `JWTExpiration`）

### 错误处理
```go
if err != nil {
    return nil, fmt.Errorf("operation failed: %w", err)
}
```

## 开发流程

### 1. 添加新接口

1. 在 `handler/` 创建处理器
2. 在 `service/` 添加业务逻辑
3. 在 `model/` 定义数据模型
4. 在 `main.go` 注册路由

### 2. 数据库变更

1. 在 `internal/model/` 更新模型
2. 创建迁移脚本（`migrations/`）
3. 运行迁移：`docker-compose exec postgres psql ...`

### 3. 测试

```bash
# 单元测试
go test ./...

# 集成测试
go test -integration ./...
```

### 4. 构建

```bash
# 本地构建
go build -o spacelab-backend ./cmd/server

# Docker 构建
docker build -t spacelab-backend:latest .
```

## 代码规范

### 导入顺序
1. 标准库
2. third-party 库
3. 项目内部包

### 错误处理
- 不要忽略错误
- 使用 `fmt.Errorf()` 包装错误
- 返回清晰的错误消息

### 注释
- 导出函数必须注释
- 复杂逻辑添加注释
- 使用 `//` 而不是 `/* */`

### 测试
- 每个服务层编写单元测试
- 测试覆盖率 > 80%
- 集成测试覆盖主要流程

## 安全最佳实践

1. **密码安全**
   - 使用 SHA256 哈希
   - 不存储明文密码

2. **JWT 安全**
   - 使用强随机密钥
   - 设置合理过期时间
   - 验证签名

3. **SQL 注入**
   - 使用 Gorm ORM
   - 参数化查询

4. **XSS 防护**
   - 对用户输入转义
   - 设置安全头

5. **CORS 配置**
   - 限制允许的来源
   - 不开放 `*`

6. **文件上传**
   - 验证文件类型
   - 限制文件大小
   - 随机化文件名

## 性能优化

1. **数据库**
   - 添加索引
   - 使用连接池
   - 定期清理旧数据

2. **缓存**
   - Redis 缓存热门数据
   - API 响应缓存

3. **静态资源**
   - CDN 加速
   - 浏览器缓存

4. **压缩**
   - Gzip 响应
   - 图片优化

## 监控与日志

### 日志格式
```json
{
  "timestamp": "2026-06-09T14:00:00Z",
  "level": "info",
  "message": "Request processed",
  "duration_ms": 150,
  "method": "GET",
  "path": "/api/v1/posts",
  "user_id": "uuid"
}
```

### 指标
- 请求数量
- 平均响应时间
- 错误率
- 数据库连接数

### 告警
- API 错误率 > 5%
- 响应时间 > 1s
- 数据库连接数 > 80%
