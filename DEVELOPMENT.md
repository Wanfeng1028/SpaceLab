# SpaceLab DEVELOPMENT.md

> 本文档是 SpaceLab 的开发规范。  
> 项目将交给 AI 或开发者持续实现，因此代码必须可维护、可扩展、可分阶段提交、可回滚。  
> 任何实现都必须先读 `DESIGN.md`，再读本文件。

---

## 0. 项目信息

### 0.1 项目名称

```txt
SpaceLab
```

### 0.2 仓库地址

```txt
https://github.com/Wanfeng1028/SpaceLab
```

### 0.3 仓库命名规则

项目中不要出现个人姓名作为品牌名。  
页面展示名统一使用：

```txt
SpaceLab
```

### 0.4 开发硬性要求

每完成一个相对独立、可运行、可验证的开发阶段，必须：

```bash
git status
git add .
git commit -m "type(scope): message"
git push origin main
```

如果当前分支不是 main，则推送当前开发分支：

```bash
git push origin <branch-name>
```

禁止长期本地开发不提交、不推送。  
禁止一次性完成大量功能后才提交。  
每次提交必须保证项目能正常启动或至少不破坏已完成部分。

---

## 1. Project Rules

### 1.1 文档优先

开发顺序：

```txt
1. 阅读 DESIGN.md
2. 阅读 DEVELOPMENT.md
3. 根据当前阶段创建任务清单
4. 实现小而完整的功能
5. 本地运行检查
6. 提交 commit
7. 推送到远端 GitHub
```

### 1.2 AI 开发规则

因为项目会交给 AI 写代码，所以必须强制可维护：

- 不允许一次性生成巨大文件。
- 不允许把所有逻辑写在一个组件里。
- 不允许在页面组件中堆积业务逻辑。
- 不允许重复写相同样式。
- 不允许随便引入大型依赖。
- 不允许为了炫酷写不可读代码。
- 不允许跳过移动端。
- 不允许跳过错误态、空态、加载态。
- 不允许跳过安全边界。
- 不允许跳过 Git 提交和远端推送。

AI 每次开发前必须先输出本次任务范围，例如：

```txt
本次只实现：Home Hero + 基础布局 + 样式变量
本次不实现：文章系统、后台、访问分析
```

完成后必须说明：

```txt
已完成什么
未完成什么
如何运行
如何验证
是否已提交
是否已推送
```

### 1.3 可维护代码原则

代码必须遵守：

- 单一职责
- 组件拆分清晰
- 命名清晰
- 数据结构类型明确
- 样式 token 化
- 业务逻辑 service 化
- API 调用集中管理
- 3D 逻辑与页面组件隔离
- 图表逻辑与数据获取隔离
- 上传逻辑与编辑器隔离
- 不在模板里写复杂表达式
- 不在组件里直接散落 magic number
- 不在 SCSS 里到处写十六进制颜色

---

## 2. Tech Stack

### 2.1 前端框架

```txt
Angular
TypeScript
Angular Standalone Components
Angular Router
SCSS + CSS Variables
```

### 2.2 视觉与动效

```txt
Three.js
GSAP
ScrollTrigger
CSS Transitions
IntersectionObserver
```

### 2.3 文章与内容

```txt
Markdown
Markdown Editor
Markdown Preview
Code Highlight
DOM Sanitization
```

### 2.4 数据与存储

推荐使用：

```txt
Supabase Database
Supabase Storage
Supabase Auth
```

用途：

- posts 表保存文章
- media 表保存媒体信息
- Storage 保存图片、GIF、视频
- analytics_events 表保存访问事件
- post_views 表保存文章阅读量
- Auth 限制 Admin / Write 只允许站长使用

### 2.5 可视化

推荐：

```txt
ECharts 或 Apache ECharts
Three.js 粒子流
CSS 数据卡片动画
```

图表库只选一种主图表方案，不要同时混用多个图表库。

### 2.6 国际化

推荐：

```txt
Angular i18n 或 ngx-translate
```

项目必须支持中英文内容和 UI 文案切换。

### 2.7 代码质量

```txt
ESLint
Prettier
Stylelint
TypeScript strict mode
```

---

## 3. Directory Structure

推荐目录：

```txt
src/
  app/
    core/
      config/
      constants/
      guards/
      interceptors/
      models/
      services/
      utils/

    shared/
      components/
        buttons/
        cards/
        layout/
        media/
        markdown/
        motion/
        navigation/
        visualizations/
      directives/
      pipes/

    features/
      home/
      blog/
      article/
      projects/
      project-detail/
      lab/
      gallery/
      about/
      archive/
      admin/
      analytics/

    three/
      components/
      services/
      scenes/
      utils/

    i18n/
      zh-CN.json
      en-US.json

  styles/
    abstracts/
      _tokens.scss
      _mixins.scss
      _functions.scss
    base/
      _reset.scss
      _typography.scss
      _a11y.scss
    components/
      _buttons.scss
      _cards.scss
      _forms.scss
      _markdown.scss
    utilities/
      _layout.scss
      _motion.scss
      _responsive.scss
    styles.scss

  assets/
    images/
    videos/
    gifs/
    models/
    lottie/
    rive/
    placeholders/
```

### 3.1 目录职责

`core/`：

- 全局配置
- API 服务
- 路由守卫
- 数据模型
- 工具函数
- Supabase client

`shared/`：

- 可复用 UI 组件
- 可复用 directive
- pipe
- layout 组件
- media 组件

`features/`：

- 页面级功能模块
- 每个页面独立目录
- 页面内部可以有局部组件

`three/`：

- Three.js 场景
- WebGL 生命周期管理
- 3D 组件
- 3D 工具函数

`styles/`：

- 全局设计 token
- mixin
- reset
- typography
- 组件基础样式
- 响应式工具

---

## 4. Routing Rules

### 4.1 普通页面路由

```txt
/                       Home
/blog                   Blog List
/blog/:slug             Article Detail
/projects               Projects
/projects/:slug         Project Detail
/lab                    Lab / Playground
/gallery                Gallery
/about                  About
/archive                Archive
```

### 4.2 隐藏管理路由

```txt
/admin                  Admin Home
/admin/write            Write Article
/admin/write/:id        Edit Article
/admin/analytics        Analytics Dashboard
```

### 4.3 路由规则

- `/admin` 不放在普通导航。
- `/admin` 必须有访问保护。
- 普通访客不能看到草稿文章。
- 不存在的文章进入 404。
- 不存在的项目进入 404。
- 文章 slug 必须唯一。
- 中英文页面切换时要保持当前页面上下文。

---

## 5. Article System

### 5.1 文章系统是必做功能

文章系统本次项目必须做，不是可选，不是以后再说。

必须实现：

- 在线新建文章
- 在线编辑文章
- 草稿保存
- 发布文章
- 删除或归档文章
- 文章列表展示
- 文章详情展示
- Markdown 编辑
- Markdown 预览
- 上传封面
- 上传图片
- 上传 GIF
- 上传视频
- 标签管理
- 分类管理
- 阅读量统计
- 文章搜索
- 文章归档

### 5.2 文章状态

```txt
draft       草稿
published   已发布
archived    已归档
```

普通用户只能看到：

```txt
published
```

站长在 Admin 中可以看到全部状态。

### 5.3 文章字段

`posts` 表建议字段：

```sql
id uuid primary key
slug text unique not null
title text not null
summary text
content markdown text not null
cover_url text
cover_type text
category text
tags text[]
status text not null
language text not null
reading_time integer
view_count integer default 0
created_at timestamptz
updated_at timestamptz
published_at timestamptz
```

### 5.4 文章模型

前端类型：

```ts
export type PostStatus = 'draft' | 'published' | 'archived';
export type CoverType = 'image' | 'gif' | 'video' | 'none';
export type LanguageCode = 'zh-CN' | 'en-US';

export interface Post {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  content: string;
  coverUrl?: string;
  coverType: CoverType;
  category?: string;
  tags: string[];
  status: PostStatus;
  language: LanguageCode;
  readingTime: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}
```

### 5.5 Blog 页面功能

必须支持：

- 拉取 published 文章
- 按发布时间排序
- 搜索标题和摘要
- 按标签筛选
- 按分类筛选
- 按语言筛选
- 空状态展示
- 加载状态展示
- 错误状态展示
- 移动端单列展示

### 5.6 Article Detail 功能

必须支持：

- 根据 slug 拉取文章
- 渲染 Markdown
- 代码高亮
- 图片自适应
- GIF 正常播放
- 视频正常播放
- TOC 目录
- 阅读进度条
- 阅读量增加
- 上一篇 / 下一篇
- 404 状态
- 加载状态
- 错误状态

### 5.7 Markdown 安全

Markdown 渲染必须做 sanitization。  
如果允许 HTML，必须经过白名单过滤。  
禁止直接把不可信 HTML 使用 innerHTML 注入页面。

---

## 6. Admin / Write Rules

### 6.1 Admin 定位

Admin / Write 是隐藏写作页，不是开放注册系统。  
只允许站长使用。

### 6.2 登录保护

推荐使用 Supabase Auth，仅允许指定邮箱访问。

规则：

- 未登录访问 `/admin`，跳转到登录页。
- 登录后检查邮箱白名单。
- 非白名单用户拒绝访问。
- 登录状态过期后重新登录。
- 不允许普通用户注册成为作者。

### 6.3 写文章功能

必须支持：

- 新建文章
- 编辑文章
- 保存草稿
- 发布文章
- 取消发布
- 删除或归档
- 自动保存草稿
- Markdown 实时预览
- 上传封面
- 插入图片
- 插入 GIF
- 插入视频
- 设置标签
- 设置分类
- 设置语言
- 设置 slug
- slug 重复检测
- 离开页面前未保存提醒

### 6.4 写作页面状态

必须有：

- loading
- saving
- saved
- publishing
- upload progress
- error
- empty
- dirty unsaved

### 6.5 写作页布局

桌面端：

```txt
Topbar:
  Back
  Save Draft
  Publish
  Preview
  Status

Main:
  Left editor
  Right preview
```

移动端：

```txt
Tabs:
  Meta
  Editor
  Preview
  Media
```

---

## 7. Media Upload Rules

### 7.1 支持上传类型

必须支持：

```txt
jpg
jpeg
png
webp
avif
gif
mp4
webm
```

可选：

```txt
lottie json
riv
glb
gltf
```

### 7.2 存储路径

Supabase Storage 建议：

```txt
media/
  posts/
    covers/
    images/
    gifs/
    videos/
  projects/
    covers/
    videos/
  gallery/
    images/
    gifs/
    videos/
  lab/
    demos/
```

### 7.3 文件命名

上传文件命名：

```txt
{type}/{yyyy}/{mm}/{timestamp}-{slug-safe-name}.{ext}
```

不要使用中文文件名作为最终存储名。  
原始文件名可以作为 metadata 保存。

### 7.4 上传限制

建议限制：

```txt
image <= 5MB
gif <= 15MB
video <= 80MB
model <= 30MB
```

超过限制时给出提示。

### 7.5 媒体模型

```ts
export type MediaType = 'image' | 'gif' | 'video' | 'model' | 'lottie' | 'rive';

export interface MediaAsset {
  id: string;
  type: MediaType;
  url: string;
  storagePath: string;
  title?: string;
  alt?: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
  createdAt: string;
}
```

---

## 8. Analytics Rules

### 8.1 访问分析是项目功能之一

需要实现：

- 首页 Site Pulse 概览
- 隐藏 Analytics Dashboard
- 页面访问记录
- 文章访问记录
- 媒体播放记录
- 按钮点击记录
- Demo 打开记录

### 8.2 事件类型

```ts
export type AnalyticsEventType =
  | 'page_view'
  | 'article_view'
  | 'project_view'
  | 'media_play'
  | 'button_click'
  | 'demo_open'
  | 'contact_click';
```

### 8.3 analytics_events 表

```sql
id uuid primary key
event_type text not null
page_path text
page_title text
target_id text
target_type text
referrer text
device_type text
browser text
language text
created_at timestamptz
```

### 8.4 隐私边界

不要收集：

- 真实姓名
- 手机号
- 邮箱
- 精确地址
- 完整明文 IP
- 账号隐私信息

可以统计：

- 页面路径
- 设备类型
- 浏览器类型
- 语言
- 时间
- 文章阅读量
- 媒体播放次数
- 按钮点击次数

### 8.5 Site Pulse 概览

首页展示：

- 总访问
- 今日访问
- 热门页面
- 热门文章
- 访问趋势

### 8.6 Analytics Dashboard

隐藏页面展示：

- PV
- UV
- 今日访问
- 本周访问
- 本月访问
- 页面排行
- 文章排行
- 设备类型
- 浏览器类型
- 媒体播放
- 按钮点击

---

## 9. Internationalization

### 9.1 必须支持中英文

项目需要支持：

```txt
中文 zh-CN
英文 en-US
```

### 9.2 UI 文案

所有 UI 文案都应该从 i18n 文件读取，不要散落在组件里。

示例：

```json
{
  "home": {
    "welcome": "欢迎",
    "enter": "进入",
    "contact": "联系我"
  }
}
```

英文：

```json
{
  "home": {
    "welcome": "Welcome",
    "enter": "Enter",
    "contact": "Contact"
  }
}
```

### 9.3 文章语言

文章必须有 language 字段。  
Blog 页面可以筛选语言。  
当前 UI 语言与文章语言可以关联，也允许展示全部文章。

---

## 10. Styling Rules

### 10.1 SCSS 结构

样式必须分层：

```txt
tokens
mixins
reset
typography
components
utilities
page-specific
```

### 10.2 禁止硬编码

组件 SCSS 中禁止大量出现：

```css
#ffffff
#000000
rgba(0, 0, 0, ...)
box-shadow: 随便写
border-radius: 随便写
```

应使用：

```css
var(--color-text)
var(--glass-bg)
var(--radius-xl)
var(--glass-shadow)
```

### 10.3 组件样式

组件应有清晰 BEM 或一致命名：

```scss
.article-card {
}
.article-card__cover {
}
.article-card__title {
}
.article-card__meta {
}
.article-card--featured {
}
```

### 10.4 状态样式

交互组件必须包含：

- default
- hover
- active
- focus-visible
- disabled
- loading

### 10.5 移动端样式

每个页面都必须检查：

- 是否横向溢出
- 文字是否过小
- 卡片是否太窄
- 3D 是否过重
- 按钮是否可点
- 视频是否适配
- 表单是否可用

---

## 11. 3D / Motion Rules

### 11.1 Three.js 代码组织

不要把 Three.js 初始化代码直接写满页面组件。  
应拆分为：

```txt
three/
  scenes/
    home-portal.scene.ts
    orbit-menu.scene.ts
  services/
    three-renderer.service.ts
    three-asset-loader.service.ts
  components/
    three-canvas/
```

### 11.2 生命周期

每个 3D 场景必须支持：

- init
- resize
- pause
- resume
- destroy
- dispose

组件销毁时必须释放：

- geometry
- material
- texture
- renderer
- event listeners
- animation frame

### 11.3 性能规则

- 限制 WebGL 场景数量。
- 离开视口暂停渲染。
- 移动端降低 DPR。
- 移动端减少粒子数量。
- 避免大量实时阴影。
- 避免不必要的 postprocessing。
- 使用 requestAnimationFrame 管理动画。
- 使用 IntersectionObserver 管理可见性。

### 11.4 GSAP 规则

GSAP 用于：

- 首页滚动叙事
- Portal 打开
- 卡片汇聚
- 液态切换
- 数据动态出现

不要用于：

- 普通 hover
- 简单 fade
- 文章页正常滚动
- 可用 CSS 完成的小动效

### 11.5 reduced-motion

必须检测：

```txt
prefers-reduced-motion
```

开启时：

- 关闭自动旋转
- 关闭复杂 pin
- 关闭粒子大规模运动
- 保留基本淡入
- 保证内容可访问

---

## 12. Data Layer

### 12.1 服务拆分

推荐服务：

```txt
AuthService
PostService
MediaService
AnalyticsService
ProjectService
GalleryService
I18nService
SeoService
ThreePerformanceService
```

### 12.2 API 访问

所有 API 调用集中在 service 中。  
组件只调用 service，不直接写数据库查询。

### 12.3 错误处理

每个 service 都要返回明确错误。  
页面必须显示友好错误态。  
Admin 页面错误要可操作，例如“重试”“重新登录”“检查文件大小”。

### 12.4 Loading 状态

每个异步页面必须有 loading 状态。  
不能空白等待。

---

## 13. Security Rules

### 13.1 Admin 安全

- Admin 必须登录。
- 只允许站长邮箱。
- 不允许开放注册。
- 不允许普通访客写文章。
- 不允许前端隐藏按钮当作权限控制，必须数据库规则也限制。

### 13.2 Supabase RLS

必须开启 Row Level Security。

规则方向：

- published posts 可公开读取。
- draft posts 只有站长可读取。
- insert/update/delete posts 只有站长可操作。
- media upload 只有站长可操作。
- gallery published 媒体可公开读取。
- analytics insert 可允许匿名有限写入。
- analytics read 只有站长可读取。

### 13.3 XSS

Markdown 渲染必须安全处理。  
禁止直接信任用户输入。  
虽然写文章的人是站长，也要保持安全习惯。

---

## 14. README Requirement

项目最终必须有一个好看的 README.md。  
README 要有炫酷感，适合 GitHub 首页展示。

README 必须包含：

- 项目 Logo / Title：SpaceLab
- 项目一句话介绍
- 英文简介
- 中文简介
- Preview 截图或 GIF 占位
- Features
- Tech Stack
- Project Structure
- Getting Started
- Environment Variables
- Development Workflow
- Deployment
- Roadmap
- License
- Credits

README 视觉建议：

- 使用 emoji 但不要过多。
- 使用 badge。
- 使用分区标题。
- 可以加入 ASCII / SVG 风格标题。
- 加入 Preview 图片或 GIF 后会更好。
- 不出现个人姓名作为项目品牌。
- 仓库名和项目名统一为 SpaceLab。

README 后续单独生成，不要和本文件混在一起。

---

## 15. Git Workflow

### 15.1 每阶段必须推送

远端仓库：

```txt
https://github.com/Wanfeng1028/SpaceLab
```

每完成一部分开发都要推送远端。

建议阶段：

```txt
phase-01-project-setup
phase-02-design-system
phase-03-home-hero
phase-04-home-sections
phase-05-routing-layout
phase-06-blog-list
phase-07-article-detail
phase-08-admin-write
phase-09-media-upload
phase-10-projects
phase-11-lab-gallery
phase-12-analytics
phase-13-i18n-mobile
phase-14-readme-polish
```

每个阶段完成后：

```bash
npm run lint
npm run build
git status
git add .
git commit -m "feat(scope): short description"
git push origin main
```

如果 lint 或 build 失败，不要推送，先修复。

### 15.2 Commit Message

格式：

```txt
type(scope): message
```

type：

```txt
feat
fix
docs
style
refactor
perf
test
chore
build
```

示例：

```bash
git commit -m "feat(home): add minimal hero section"
git commit -m "feat(blog): add post list and filters"
git commit -m "feat(admin): add markdown editor draft save"
git commit -m "feat(analytics): add site pulse cards"
git commit -m "docs: add design and development guidelines"
```

### 15.3 AI 每次提交前自检

AI 必须检查：

```txt
是否改动范围过大
是否能启动
是否破坏已有页面
是否符合 DESIGN.md
是否符合 DEVELOPMENT.md
是否有移动端样式
是否有 loading / error / empty 状态
是否需要更新文档
是否已提交
是否已推送
```

---

## 16. Build & Run

### 16.1 常用命令

```bash
npm install
npm run start
npm run build
npm run lint
npm run format
```

### 16.2 环境变量

`.env` 或 Angular environment 中需要：

```txt
SUPABASE_URL=
SUPABASE_ANON_KEY=
ADMIN_EMAIL=
SITE_URL=
```

禁止提交真实密钥。

### 16.3 部署

部署平台可选：

- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages

如果使用 Supabase，前端部署平台只负责静态站点和前端路由。

---

## 17. Acceptance Checklist

### 17.1 Home

- [ ] 首屏只显示“欢迎”“进入”“联系我”
- [ ] 首页下方有 3D Portal
- [ ] 有内容星环或等价炫酷入口
- [ ] 有精选项目
- [ ] 有最新文章
- [ ] 有 Lab Preview
- [ ] 有 Gallery Preview
- [ ] 有 Site Pulse
- [ ] 有 Contact

### 17.2 Article

- [ ] Blog 列表能展示发布文章
- [ ] Article Detail 能根据 slug 打开
- [ ] Markdown 正常渲染
- [ ] 代码高亮正常
- [ ] 图片/GIF/视频正常展示
- [ ] 移动端可读
- [ ] 阅读量能记录

### 17.3 Admin / Write

- [ ] 站长能登录
- [ ] 非站长不能进入
- [ ] 能新建文章
- [ ] 能编辑文章
- [ ] 能保存草稿
- [ ] 能发布文章
- [ ] 能上传封面
- [ ] 能上传图片/GIF/视频
- [ ] 有实时预览
- [ ] 有未保存提醒

### 17.4 Analytics

- [ ] 能记录 page_view
- [ ] 能记录 article_view
- [ ] 能记录 media_play
- [ ] 首页 Site Pulse 能显示概览
- [ ] 隐藏 Analytics Dashboard 能显示详细数据
- [ ] 不收集敏感个人信息

### 17.5 UI / Motion

- [ ] Google Blue Button 完成
- [ ] Glass Button 完成
- [ ] Liquid Glass Segmented Control 完成
- [ ] Glass Card 完成
- [ ] 3D 场景可暂停和销毁
- [ ] reduced-motion 可用
- [ ] 移动端适配完成

### 17.6 Git

- [ ] 每个阶段有 commit
- [ ] 每个阶段已 push 到远端
- [ ] 远端仓库可看到最新代码
- [ ] README 后续已补充
