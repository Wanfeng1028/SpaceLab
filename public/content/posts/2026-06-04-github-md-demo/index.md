---
title: GitHub Markdown 渲染演示
slug: 2026-06-04-github-md-demo
date: 2026-06-04
category: 开发
tags:
  - Markdown
  - GitHub
  - 演示
summary: 这是一个通过 GitHub 托管的 Markdown 文章示例，展示 SpaceLab 的多源文章仓储能力。
published: true
---

# GitHub Markdown 渲染演示

欢迎！这是一篇通过 **GitHub 托管**的 Markdown 文章示例。

## 功能展示

### 代码块

```typescript
function greet(name: string): string {
  return `Hello, ${name}!`;
}

console.log(greet('SpaceLab'));
```

### 表格

| 特性 | 状态 | 说明 |
|------|------|------|
| Static 文章 | ✅ 已实现 | 构建时生成 |
| GitHub 文章 | ✅ 已实现 | 运行时获取 |
| Supabase 文章 | 🚧 待实现 | 预留接口 |

### 引用块

> 多源文章仓储让 SpaceLab 可以同时支持本地构建和 GitHub 托管两种内容发布模式。

### 列表

- [x] 统一文章模型
- [x] GitHub 文章提供者
- [x] Markdown 渲染服务
- [ ] Supabase 集成
- [ ] 全文搜索

## 图片引用

相对路径 `./assets/` 会被自动解析为 GitHub raw URL。

---

*这篇文章由 `ArticleRepositoryService` 从 GitHub 仓库动态获取并渲染。*
