# 🌌 SpaceLab

个人数字空间网站 — 基于 Angular 21 + Three.js + GSAP 构建

## ✨ 特性

- **3D 粒子背景** — Three.js 渲染的动态粒子场，支持鼠标视差交互
- **Glassmorphism 设计** — 玻璃拟态 UI，8 种变体 mixin 系统
- **文章发布系统** — Markdown 写作、分类筛选、阅读时间估算
- **项目展示** — 分类过滤的项目卡片展示
- **Lab 实验室** — 动效与交互实验空间
- **Gallery 画廊** — 媒体作品集
- **访问分析** — PV/UV 统计、趋势图表
- **中英双语** — i18n 国际化支持
- **响应式设计** — 适配桌面 / 平板 / 手机
- **无障碍** — `prefers-reduced-motion` 支持

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Angular 21.2 (Standalone Components) |
| 语言 | TypeScript 5.9 |
| 样式 | SCSS + CSS Variables |
| 3D | Three.js |
| 动画 | GSAP |
| 后端 | Supabase (规划中) |
| 设计 | Glassmorphism |

## 🚀 快速开始

```bash
# 克隆项目
git clone https://github.com/Wanfeng1028/SpaceLab.git
cd SpaceLab

# 安装依赖
npm install

# 启动开发服务器
ng serve
# 或
npm start

# 构建生产版本
ng build
```

访问 `http://localhost:4200/` 查看效果。

## 📁 项目结构

```
src/
├── app/
│   ├── core/           # 核心模块 (模型、常量、配置、服务)
│   ├── features/       # 功能页面
│   │   ├── home/       # 首页 (Hero + 各区块)
│   │   ├── blog/       # 博客列表
│   │   ├── article/    # 文章详情
│   │   ├── projects/   # 项目展示
│   │   ├── lab/        # 实验室
│   │   ├── gallery/    # 画廊
│   │   ├── about/      # 关于
│   │   ├── archive/    # 归档
│   │   ├── admin/      # 后台管理 (隐藏路由)
│   │   └── analytics/  # 访问分析
│   ├── shared/         # 共享组件 (卡片、导航栏等)
│   ├── three/          # Three.js 场景和组件
│   └── i18n/           # 国际化翻译文件
├── styles/             # 设计系统
│   ├── abstracts/      # 变量、mixin、函数、玻璃拟态
│   ├── base/           # 重置、排版、无障碍
│   ├── components/     # 按钮、卡片、表单、Markdown
│   └── utilities/      # 布局、动效、响应式
└── assets/             # 静态资源
```

## 🎨 设计系统

### 颜色

- 背景: `#e8e3d8` (暖灰)
- 主色: `#1a73e8` (Google Blue)
- 文字: `#171717` / `#555` / `#999`

### 字体

- 中文: Noto Sans SC
- 英文: Inter
- 代码: JetBrains Mono

### 断点

| 名称 | 范围 |
|------|------|
| Desktop | ≥ 1200px |
| Laptop | 992 - 1199px |
| Tablet | 768 - 991px |
| Mobile | < 768px |
| Small Mobile | < 480px |

## 📋 开发路线

- [x] Phase 01: 项目初始化
- [x] Phase 02: 设计系统
- [x] Phase 03: Home Hero (3D 粒子 + 动画)
- [x] Phase 04: Home 各区块
- [x] Phase 05: 路由与全局布局
- [x] Phase 06: Blog 文章列表
- [x] Phase 07: Article 文章详情
- [x] Phase 08: Projects 项目展示
- [x] Phase 09: Lab / Gallery / About / Archive
- [x] Phase 10: Admin 写作页 + 404
- [x] Phase 11: Analytics 访问分析
- [x] Phase 12: README + 最终打磨
- [ ] Phase 13: Supabase 集成
- [ ] Phase 14: 生产部署

## 📄 License

MIT
