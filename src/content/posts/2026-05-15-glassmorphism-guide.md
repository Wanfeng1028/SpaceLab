---
title: 'Glassmorphism 设计指南'
slug: 'glassmorphism-guide'
date: '2026-05-15'
category: '设计'
tags: ['设计', 'CSS']
cover: ''
summary: '玻璃拟态是一种流行的 UI 设计风格，通过半透明、模糊和微妙的边框创造出玻璃般的质感。'
published: true
---

玻璃拟态（Glassmorphism）是一种流行的 UI 设计风格，通过半透明、模糊和微妙的边框创造出玻璃般的质感。

## 核心要素

- **半透明背景** — 使用 `rgba` 或 `hsla` 设置透明度
- **背景模糊** — `backdrop-filter: blur()`
- **微妙边框** — 细微的半透明边框增加层次感
- **柔和阴影** — 营造悬浮感

## CSS 实现

```css
.glass-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}
```

## 设计建议

不要过度使用模糊效果，保持界面的可读性。在深色背景上使用玻璃效果通常能获得更好的视觉效果。
