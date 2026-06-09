# LiveComment 前端集成指南

## 快速开始

### 1. 配置环境变量

编辑 `src/environments/environment.ts`：

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api/v1',
  liveCommentSiteId: 'your-site-id-here', // 从 https://livecomment.cn 获取
  appVersion: '1.0.0',
  debug: true
};
```

### 2. 使用组件

在需要评论的页面引入 `LiveCommentComponent`：

```typescript
// my-page.component.ts
import { Component } from '@angular/core';
import { LiveCommentComponent } from '../../shared/components/live-comment/live-comment.component';

@Component({
  selector: 'app-my-page',
  standalone: true,
  imports: [LiveCommentComponent],
  template: `
    <div class="content">
      <h1>{{ postTitle }}</h1>
      <p>文章内容...</p>
      
      <!-- 评论组件 -->
      <app-live-comment
        [postId]="postSlug"
        [postTitle]="postTitle"
        [pageSize]="10"
        [enableReply]="true"
        [enableLike]="true"
      ></app-live-comment>
    </div>
  `
})
export class MyPageComponent {
  postTitle = '我的文章标题';
  postSlug = 'my-article-slug';
}
```

### 3. 组件参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `postId` | string | ✅ | - | 文章 ID 或 slug |
| `postTitle` | string | ❌ | '' | 文章标题（用于显示） |
| `pageSize` | number | ❌ | 10 | 每页评论数 |
| `enableReply` | boolean | ❌ | true | 启用回复功能 |
| `enableLike` | boolean | ❌ | false | 启用点赞功能 |

### 4. 事件监听

```typescript
<app-live-comment
  [postId]="postSlug"
  (commentCountChange)="onCommentCountChange($event)"
></app-live-comment>

// 组件类
onCommentCountChange(count: number) {
  console.log('评论数量更新:', count);
  this.commentCount = count;
}
```

## 样式自定义

评论组件使用 CSS 变量，可以在 `styles.scss` 中自定义：

```scss
:root {
  // 背景色
  --bg-secondary: #1a1a2e;
  --bg-tertiary: #242442;
  
  // 文字颜色
  --text-primary: #ffffff;
  --text-secondary: #e0e0e0;
  --text-muted: #888;
  
  // 边框
  --border-color: #333;
  
  // 主题色
  --primary-color: #6366f1;
  --primary-hover: #4f46e5;
  
  // 阴影
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

## 响应式布局

组件自动适配移动端：
- 移动端：单列布局
- 桌面端：适当宽度
- 触摸友好：按钮大小适配

## 注意事项

1. **必须先配置 LiveComment 站点 ID**
2. **确保后端服务已启动**
3. **检查 CORS 配置**
4. **使用 HTTPS（生产环境）**

## 常见问题

### Q: 评论无法加载
**A:** 检查以下配置：
- `environment.ts` 中的 `apiUrl` 是否正确
- 后端服务是否运行 (`http://localhost:8080/health`)
- LiveComment 站点 ID 是否配置

### Q: 发表评论失败
**A:** 确保：
- 用户已登录
- JWT Token 有效
- 网络连接正常

### Q: 样式异常
**A:** 检查：
- CSS 变量是否正确定义
- 组件样式是否被覆盖
- 浏览器控制台是否有错误

## 完整示例

```typescript
// article-detail.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LiveCommentComponent } from '../../shared/components/live-comment/live-comment.component';

@Component({
  selector: 'app-article-detail',
  standalone: true,
  imports: [LiveCommentComponent],
  template: `
    <article class="article">
      <header>
        <h1>{{ article?.title }}</h1>
        <div class="meta">
          <span>{{ article?.date }}</span>
          <span>{{ article?.viewCount }} 次浏览</span>
        </div>
      </header>
      
      <div class="content" [innerHTML]="article?.content"></div>
      
      <section class="comments">
        <h2>评论</h2>
        <app-live-comment
          *ngIf="article"
          [postId]="article.slug"
          [postTitle]="article.title"
          [pageSize]="10"
          [enableReply]="true"
          [enableLike]="true"
          (commentCountChange)="updateCommentCount($event)"
        ></app-live-comment>
      </section>
    </article>
  `,
  styles: [`
    .article {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .meta {
      color: #666;
      margin-bottom: 20px;
    }
    
    .comments {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
    }
  `]
})
export class ArticleDetailComponent implements OnInit {
  article: any;
  commentCount = 0;
  
  constructor(private route: ActivatedRoute) {}
  
  ngOnInit() {
    // 加载文章数据
    this.route.params.subscribe(params => {
      this.loadArticle(params['slug']);
    });
  }
  
  loadArticle(slug: string) {
    // API 调用获取文章
  }
  
  updateCommentCount(count: number) {
    this.commentCount = count;
  }
}
```

## 技术支持

如有问题，请：
1. 查看浏览器控制台错误
2. 检查网络请求
3. 查阅 LiveComment 官方文档
4. 提交 GitHub Issue
