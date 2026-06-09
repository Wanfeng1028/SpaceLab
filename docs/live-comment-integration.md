# LiveComment 评论系统集成文档

## 概述

本文档介绍 SpaceLab 项目中使用 LiveComment 开源评论系统的集成方法。

## 什么是 LiveComment

LiveComment 是一个轻量级、易集成的开源评论系统，支持：
- Markdown 格式
- 防垃圾机制
- 评论回复
- 管理员审核
- 响应式设计

官方文档：https://docs.livecomment.cn/

## 后端集成

### 1. 后端配置

在 `backend/.env` 中添加：

```env
LIVECOMMENT_SITE_ID=your-site-id-here
```

### 2. API 接口

后端已提供以下接口：

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/v1/posts/:post_id/comments` | GET | 获取评论列表 |
| `/api/v1/posts/:post_id/comment-count` | GET | 获取评论数量 |
| `/api/v1/posts/:post_id/comments` | POST | 创建评论（需登录） |
| `/api/v1/comments/:id` | PUT | 更新评论（需登录） |
| `/api/v1/comments/:id` | DELETE | 删除评论（需登录） |
| `/api/v1/comments/:id/approve` | POST | 审核评论（管理员） |

## 前端集成

### 1. 组件结构

```
src/app/
├── core/
│   └── services/
│       └── live-comment.service.ts  # API 服务
└── shared/
    └── components/
        ├── live-comment/
        │   ├── live-comment.component.ts
        │   ├── live-comment.component.html
        │   └── live-comment.component.scss
        └── live-comment-item/
            ├── live-comment-item.component.ts
            ├── live-comment-item.component.html
            └── live-comment-item.component.scss
```

### 2. 使用方式

在需要评论功能的组件中引入：

```typescript
import { LiveCommentComponent } from '../../shared/components/live-comment/live-comment.component';

@Component({
  selector: 'app-article',
  imports: [LiveCommentComponent],
  // ...
})
export class ArticleComponent {
  // ...
}
```

### 3. 模板用法

```html
<app-live-comment
  [postId]="post.slug"
  [postTitle]="post.title"
  [pageSize]="10"
  [enableReply]="true"
  [enableLike]="true"
></app-live-comment>
```

### 4. 输入参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `postId` | string | 是 | - | 文章 ID 或 slug |
| `postTitle` | string | 否 | '' | 文章标题（用于显示） |
| `siteId` | string | 是 | - | LiveComment 站点 ID |
| `pageSize` | number | 否 | 10 | 每页评论数 |
| `enableReply` | boolean | 否 | true | 启用回复功能 |
| `enableLike` | boolean | 否 | false | 启用点赞功能 |

### 5. 输出事件

| 事件 | 参数 | 说明 |
|------|------|------|
| `commentCountChange` | number | 评论数量变化 |

## 环境变量配置

### 开发环境

`src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api/v1'
};
```

### 生产环境

`src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-backend-url.com/api/v1'
};
```

## 样式自定义

评论组件使用 CSS 变量，可在 `styles.scss` 中自定义：

```scss
:root {
  --bg-secondary: #1a1a2e;
  --bg-tertiary: #242442;
  --text-primary: #ffffff;
  --text-secondary: #e0e0e0;
  --text-muted: #888;
  --border-color: #333;
  --primary-color: #6366f1;
  --primary-hover: #4f46e5;
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

## 测试

### 启动服务

```bash
# 后端
cd backend
docker-compose up -d

# 前端
ng serve
```

### 测试步骤

1. 访问文章详情页
2. 查看评论列表是否正常显示
3. 尝试发表评论（需登录）
4. 尝试回复评论
5. 检查分页功能

## 常见问题

### Q1: 评论无法加载

检查：
- 后端服务是否正常运行
- API URL 配置是否正确
- 网络连接是否正常
- LiveComment 站点 ID 是否配置

### Q2: 发表评论失败

检查：
- 用户是否已登录
- JWT Token 是否有效
- 网络权限配置（CORS）

### Q3: 样式异常

检查：
- CSS 变量是否正确定义
- 组件样式是否被覆盖
- 移动端适配是否正确

## 后续扩展

- [ ] 添加评论表情支持
- [ ] 添加图片上传功能
- [ ] 集成邮箱通知
- [ ] 添加评论搜索功能
- [ ] 优化移动端体验

## 参考资料

- [LiveComment 官方文档](https://docs.livecomment.cn/)
- [LiveComment GitHub](https://github.com/livecomment/livecomment)
- [Angular 组件开发指南](https://angular.io/guide/creating-libraries)
