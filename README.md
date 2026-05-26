<div align="center">

# 🌌 SpaceLab

**A Personal Digital Space — crafted with Angular 21 + Three.js + GSAP**

[![Angular](https://img.shields.io/badge/Angular-21-DD0031?style=flat-square&logo=angular&logoColor=white)](https://angular.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Three.js](https://img.shields.io/badge/Three.js-r170-049EF4?style=flat-square&logo=three.js&logoColor=white)](https://threejs.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

<br/>

一个沉浸式的个人数字空间，融合 3D WebGL 大气散射日食场景、玻璃拟态设计系统与机械打字机交互体验。

[快速开始](#-快速开始) · [技术栈](#-技术栈) · [项目结构](#-项目结构) · [开发路线](#-开发路线)

</div>

---

## ✨ 特性

<table>
<tr>
<td width="50%">

### 🎬 沉浸式 Hero

- WebGL 大气散射日食着色器（GLSL）
- 实时亮度检测 → 按钮自动切换深黑 + 微光扫过效果
- 鼠标视差 · 轨道粒子 · 光晕渲染
- 机械打字机音效（Web Audio API）

</td>
<td width="50%">

### 🪟 Glassmorphism 设计系统

- 8 种玻璃拟态 mixin（卡片 / 面板 / 按钮）
- 深色太空主题色板 · CSS Custom Properties
- 5 级响应式断点（Desktop → Small Mobile）
- `prefers-reduced-motion` 无障碍支持

</td>
</tr>
<tr>
<td>

### 📝 内容系统

- Markdown 文章写作 · 分类筛选
- 阅读时间估算 · 文章归档
- 项目卡片展示 · Lab 实验空间
- Gallery 画廊 · 访问分析仪表盘

</td>
<td>

### 🌐 工程化

- Angular 21 Standalone Components
- SCSS 设计系统（abstracts / base / components / utilities）
- i18n 中英双语国际化
- TypeScript 严格模式

</td>
</tr>
</table>

---

## 🛠️ 技术栈

| 层级 | 技术 | 用途 |
|:---:|:---|:---|
| **框架** | Angular 21.2 | Standalone Components · Signals · 新控制流语法 |
| **语言** | TypeScript 5.9 | 严格类型 · 路径别名 |
| **3D** | Three.js r170 | WebGL 着色器 · OrthographicCamera · PlaneGeometry |
| **动画** | GSAP 3 | 时间线控制 · 缓动函数 |
| **样式** | SCSS + CSS Variables | 设计令牌 · 玻璃拟态 mixin 集合 |
| **音频** | Web Audio API | 振荡器合成 · 机械键盘 / 铃声音效 |
| **后端** | Supabase (规划中) | 数据存储 · 认证 · 实时订阅 |

---

## 🚀 快速开始

```bash
# 克隆项目
git clone https://github.com/Wanfeng1028/SpaceLab.git
cd SpaceLab

# 安装依赖
npm install

# 启动开发服务器
npm start
# → http://localhost:4200

# 构建生产版本
npx ng build
```

---

## 📁 项目结构

```
src/
├── app/
│   ├── core/                # 核心：模型 · 常量 · 配置 · 服务
│   ├── features/            # 功能页面
│   │   ├── home/            # 首页 Hero + 各区块
│   │   ├── blog/            # 博客列表
│   │   ├── article/         # 文章详情
│   │   ├── projects/        # 项目展示
│   │   ├── lab/             # 实验室
│   │   ├── gallery/         # 画廊
│   │   ├── about/           # 关于
│   │   ├── archive/         # 归档
│   │   ├── admin/           # 后台管理（隐藏路由）
│   │   └── analytics/       # 访问分析
│   ├── shared/              # 共享组件：导航栏 · 卡片
│   └── three/               # Three.js 场景与组件
├── styles/                  # 设计系统
│   ├── abstracts/           # _tokens · _glass · _mixins · _functions
│   ├── base/                # _reset · _typography · _a11y
│   ├── components/          # _buttons · _cards · _forms · _glass-buttons
│   └── utilities/           # _layout · _motion · _responsive
└── assets/                  # 静态资源
```

---

## 🎨 设计系统

### 色板

| 令牌 | 值 | 用途 |
|:---|:---:|:---|
| `--color-bg` | `#030308` | 深空背景 |
| `--color-text` | `#ffffff` | 主文字 |
| `--color-cyan` | `#00f0ff` | 品牌主色 |
| `--color-accent-yellow` | `#ffd21f` | 强调色 |
| `--color-violet` | `#bd00ff` | 渐变辅色 |

### 字体

- **正文** — Inter · Noto Sans SC
- **标题** — Newsreader · Lora
- **代码** — JetBrains Mono

### 响应式断点

| 名称 | 范围 |
|:---:|:---:|
| Desktop | `≥ 1200px` |
| Laptop | `992 – 1199px` |
| Tablet | `768 – 991px` |
| Mobile | `< 768px` |
| Small Mobile | `< 480px` |

---

## 📋 开发路线

- [x] **Phase 01** — 项目初始化 · Angular CLI 配置
- [x] **Phase 02** — 设计系统 · Glassmorphism mixin 体系
- [x] **Phase 03** — Home Hero · WebGL 日食着色器 + 粒子场
- [x] **Phase 04** — Home 各区块 · 打字机 · 仪表盘 · 矩阵雨
- [x] **Phase 05** — 路由 · 全局布局 · 导航栏
- [x] **Phase 06** — Blog 文章列表
- [x] **Phase 07** — Article 文章详情
- [x] **Phase 08** — Projects 项目展示
- [x] **Phase 09** — Lab · Gallery · About · Archive
- [x] **Phase 10** — Admin 写作页 · 404 页面
- [x] **Phase 11** — Analytics 访问分析
- [x] **Phase 12** — README · 最终打磨
- [ ] **Phase 13** — Supabase 集成
- [ ] **Phase 14** — 生产部署 · CI/CD

---

## 📄 License

[MIT](LICENSE) © [Wanfeng1028](https://github.com/Wanfeng1028)

---

<div align="center">

**Built with ☕ and curiosity**

</div>
