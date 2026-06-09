# SpaceLab API 文档

## 概述

SpaceLab 后端 API 基于 RESTful 设计，使用 JWT 进行认证。

**基础 URL:** `http://localhost:8080/api/v1`

## 认证

### 注册

**POST** `/auth/register`

**请求体:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "username": "username"
}
```

**响应:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "role": "viewer"
  },
  "expires_at": "2026-06-10T14:00:00Z"
}
```

### 登录

**POST** `/auth/login`

**请求体:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应:** 同注册

### 获取当前用户

**GET** `/auth/me`

**Header:** `Authorization: Bearer <token>`

**响应:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "username",
  "role": "viewer",
  "created_at": "2026-06-09T12:00:00Z"
}
```

### 修改密码

**PUT** `/auth/password`

**Header:** `Authorization: Bearer <token>`

**请求体:**
```json
{
  "old_password": "password123",
  "new_password": "newpassword123"
}
```

### 更新资料

**PUT** `/auth/profile`

**Header:** `Authorization: Bearer <token>`

**请求体:**
```json
{
  "username": "newusername",
  "avatar_url": "https://example.com/avatar.jpg"
}
```

## 文章

### 获取文章列表

**GET** `/posts`

**Query 参数:**
- `page` (integer) - 页码，默认 1
- `page_size` (integer) - 每页数量，默认 10
- `status` (string) - 状态：draft, published, archived
- `language` (string) - 语言：zh-CN, en-US

**响应:**
```json
{
  "posts": [
    {
      "id": "uuid",
      "slug": "my-first-post",
      "title": "My First Post",
      "summary": "Post summary",
      "cover_url": "https://example.com/cover.jpg",
      "status": "published",
      "language": "zh-CN",
      "author_id": "uuid",
      "created_at": "2026-06-09T12:00:00Z",
      "updated_at": "2026-06-09T12:00:00Z",
      "published_at": "2026-06-09T12:00:00Z",
      "view_count": 100
    }
  ],
  "total": 100,
  "page": 1,
  "page_size": 10,
  "total_pages": 10
}
```

### 获取文章详情

**GET** `/posts/:slug`

**响应:**
```json
{
  "id": "uuid",
  "slug": "my-first-post",
  "title": "My First Post",
  "summary": "Post summary",
  "content": "# Content\n\nThis is the content.",
  "cover_url": "https://example.com/cover.jpg",
  "status": "published",
  "language": "zh-CN",
  "author": {
    "id": "uuid",
    "email": "admin@spacelab.com",
    "username": "Administrator",
    "role": "admin"
  },
  "view_count": 100,
  "created_at": "2026-06-09T12:00:00Z",
  "updated_at": "2026-06-09T12:00:00Z"
}
```

### 创建文章（需权限）

**POST** `/posts`

**Header:** `Authorization: Bearer <token>`
**Header:** `Role: admin,writers`

**请求体:**
```json
{
  "slug": "my-first-post",
  "title": "My First Post",
  "summary": "Post summary",
  "content": "# Content\n\nThis is the content.",
  "cover_url": "https://example.com/cover.jpg",
  "language": "zh-CN"
}
```

### 更新文章（需权限）

**PUT** `/posts/:id`

**Header:** `Authorization: Bearer <token>`

**请求体:**
```json
{
  "title": "Updated Title",
  "summary": "Updated summary",
  "content": "# New Content"
}
```

### 删除文章（需权限）

**DELETE** `/posts/:id`

**Header:** `Authorization: Bearer <token>`

**响应:**
```json
{
  "message": "Post deleted successfully"
}
```

### 发布文章（需权限）

**POST** `/posts/:id/publish`

**Header:** `Authorization: Bearer <token>`

**响应:** 文章对象

### 增加阅读量

**POST** `/posts/:id/view`

**响应:**
```json
{
  "message": "View count incremented"
}
```

## 评论（LiveComment）

### 获取评论列表

**GET** `/posts/:post_id/comments`

**Query 参数:**
- `page` (integer) - 页码，默认 1
- `page_size` (integer) - 每页数量，默认 10

**响应:**
```json
{
  "total": 50,
  "list": [
    {
      "id": "comment-id",
      "post_id": "post-slug",
      "username": "John Doe",
      "email": "john@example.com",
      "avatar": "https://example.com/avatar.jpg",
      "content": "Great post!",
      "ip": "127.0.0.1",
      "user_id": "uuid",
      "status": "approved",
      "create_time": 1623267600,
      "update_time": 1623267600,
      "replies": []
    }
  ],
  "pager": {
    "page": 1,
    "page_size": 10,
    "total": 50,
    "count": 10
  }
}
```

### 获取评论数量

**GET** `/posts/:post_id/comment-count`

**响应:**
```json
{
  "count": 50
}
```

### 创建评论（需登录）

**POST** `/posts/:post_id/comments`

**Header:** `Authorization: Bearer <token>`

**请求体:**
```json
{
  "content": "Great post!",
  "parent_id": "optional-parent-comment-id"
}
```

### 更新评论（需登录）

**PUT** `/comments/:id`

**Header:** `Authorization: Bearer <token>`

**请求体:**
```json
{
  "content": "Updated content"
}
```

### 删除评论（需登录）

**DELETE** `/comments/:id`

**Header:** `Authorization: Bearer <token>`

**响应:**
```json
{
  "message": "Comment deleted successfully"
}
```

### 审核评论（管理员）

**POST** `/comments/:id/approve`

**Header:** `Authorization: Bearer <token>`
**Header:** `Role: admin`

**响应:** 评论对象

## 媒体

### 上传文件（需登录）

**POST** `/media/upload`

**Header:** `Authorization: Bearer <token>`
**Content-Type:** `multipart/form-data`

**表单字段:**
- `file` - 文件（最大 10MB）

**支持类型:**
- 图片：jpg, jpeg, png, gif, webp, avif
- 视频：mp4, webm

**响应:**
```json
{
  "id": "uuid",
  "url": "http://localhost:8080/uploads/2024/06/image.jpg",
  "name": "original-name.jpg",
  "type": "image",
  "size": 102400,
  "mime_type": "image/jpeg"
}
```

### 获取媒体列表

**GET** `/media`

**Query 参数:**
- `page` (integer) - 页码，默认 1
- `page_size` (integer) - 每页数量，默认 20
- `type` (string) - 类型：image, gif, video

**响应:**
```json
{
  "assets": [
    {
      "id": "uuid",
      "filename": "1234567890.jpg",
      "original_name": "original-name.jpg",
      "storage_path": "/path/to/upload/1234567890.jpg",
      "mime_type": "image/jpeg",
      "size": 102400,
      "type": "image",
      "created_at": "2026-06-09T12:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "page_size": 20,
  "total_pages": 5
}
```

### 获取媒体详情

**GET** `/media/:id`

**响应:** 媒体对象

### 删除媒体（需登录）

**DELETE** `/media/:id`

**Header:** `Authorization: Bearer <token>`

**响应:**
```json
{
  "message": "Media deleted successfully"
}
```

## 分析

### 获取统计概览

**GET** `/analytics/summary`

**响应:**
```json
{
  "total_views": 10000,
  "today_views": 150,
  "week_views": 800,
  "month_views": 3500,
  "updated_at": "2026-06-09T14:00:00Z"
}
```

### 获取热门文章

**GET** `/analytics/top-posts`

**Query 参数:**
- `limit` (integer) - 返回数量，默认 10

**响应:**
```json
[
  {
    "id": "uuid",
    "title": "Popular Post",
    "view_count": 1000
  }
]
```

### 获取流量趋势

**GET** `/analytics/traffic`

**Query 参数:**
- `days` (integer) - 天数，默认 7

**响应:**
```json
{
  "days": 7,
  "trend": [
    {
      "date": "2026-06-03",
      "views": 150
    },
    {
      "date": "2026-06-04",
      "views": 200
    }
  ]
}
```

### 记录事件

**POST** `/analytics/event`

**请求体:**
```json
{
  "event_type": "page_view",
  "page_path": "/",
  "page_title": "Home",
  "target_id": "uuid",
  "target_type": "post",
  "referrer": "https://google.com",
  "device_type": "desktop",
  "browser": "Chrome",
  "language": "zh-CN"
}
```

**响应:**
```json
{
  "message": "Event recorded successfully"
}
```

## 错误处理

### 错误响应格式

```json
{
  "error": "错误消息"
}
```

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 422 | 验证失败 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

### 常见错误

```json
// 参数验证失败
{
  "error": "email: Email 格式不正确"
}

// 未授权
{
  "error": "Missing authorization header"
}

// Token 无效
{
  "error": "Invalid or expired token"
}

// 权限不足
{
  "error": "Insufficient permissions"
}

// 资源不存在
{
  "error": "Post not found"
}
```

## 分页

所有列表接口支持分页，统一返回格式：

```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "page_size": 10,
  "total_pages": 10
}
```

## 认证要求

| 接口 | 认证 | 角色要求 |
|------|------|----------|
| 注册/登录 | ❌ | - |
| 获取当前用户 | ✅ | 已登录 |
| 文章列表/详情 | ❌ | - |
| 创建/更新/删除文章 | ✅ | admin, writer |
| 评论（公开查看） | ❌ | - |
| 评论（创建/更新） | ✅ | 已登录 |
| 评论（审核） | ✅ | admin |
| 媒体上传/删除 | ✅ | 已登录 |
| 分析概览 | ❌ | - |
| 分析详情 | ✅ | admin |

## 速率限制

- 匿名用户：100 请求/分钟
- 已登录用户：500 请求/分钟
- 管理员：1000 请求/分钟

超过限制返回 `429 Too Many Requests`。

## 版本历史

### v1.0.0 (当前)
- 基础用户认证
- 文章管理
- 评论集成（LiveComment）
- 媒体上传
- 分析统计

### v0.1.0 (计划)
- 项目管理系统
- 画廊功能
- 多语言支持
- 邮件通知
