# SpaceLab DESIGN.md

> SpaceLab 是一个极简首屏、强 3D 视觉、玻璃拟态、多媒体展示、在线文章发布和访问可视化并重的个人数字空间。  
> 本文档是项目的唯一设计规范来源。所有页面、组件、动效和视觉实现都必须先遵守本设计文档，再进入开发。

---

## 0. 设计总原则

### 0.1 项目定位

SpaceLab 不是传统博客模板，也不是普通后台管理系统，而是一个具有“个人数字空间”气质的网站。它需要同时支持：

- 极简欢迎首页
- 强 3D 视觉入口
- 炫酷交互动效
- 文章在线发布与展示
- 项目作品展示
- 动画与 3D 实验展示
- 图片、GIF、视频媒体墙
- 访问分析可视化
- 中英文内容
- 移动端适配

### 0.2 首页首屏硬性要求

首页首屏只出现：

```txt
欢迎

[进入] [联系我]
```

禁止在首页首屏出现：

- 技术栈介绍
- 个人长介绍
- 职业定位长句
- 项目说明
- 文章列表
- 访问数据
- 学习时间线
- 成长记录
- 复杂导航文案
- 大段中英文说明

首屏的重点不是“讲清楚项目”，而是用 3D、玻璃、光场和极简文字营造进入感。

### 0.3 设计关键词

```txt
Space
Lab
Portal
Glass
Liquid
Orbit
Pulse
3D
Motion
Minimal Hero
Creative Digital Space
Light Space
Liquid Glass
Soft Glow
Warm Minimal
Science Visualization
```

中文方向：

```txt
空间感
实验室感
传送入口
磨砂玻璃
液态玻璃
轨道星环
访问脉搏
3D 主视觉
极简欢迎
个人数字空间
浅色空间
液态玻璃
柔和光场
温暖极简
科学可视化
```

SpaceLab 不做全站暗黑科幻风。深色太空视觉只作为局部沉浸区块使用，默认界面应保持浅色、通透、柔和、玻璃质感。

### 0.4 Design First 工作流

开发必须遵循：

```txt
先读 DESIGN.md
再读 DEVELOPMENT.md
再写代码
写完按验收清单自检
完成一个可运行阶段后提交并推送到远端仓库
```

项目远端仓库：

```txt
https://github.com/Wanfeng1028/SpaceLab
```

任何 AI 或开发者写代码前都必须遵守：

1. 不允许脱离 DESIGN.md 自行发明另一套视觉风格。
2. 不允许在组件里随意新增颜色、阴影、圆角、字号。
3. 如果需要新增设计规则，先补充 DESIGN.md，再写代码。
4. 如果需要新增开发规则，先补充 DEVELOPMENT.md，再写代码。
5. 每个页面都必须考虑桌面端、平板端、移动端。
6. 每个交互都必须考虑 hover、active、focus、disabled、loading 状态。
7. 每个重动效都必须考虑低性能设备和 reduced-motion 降级。
8. 每完成一个相对独立、能运行的开发阶段，都要 commit 并 push 到远端仓库。

---

## 1. Design Philosophy

### 1.1 整体视觉气质

SpaceLab 的视觉气质是：

```txt
极简入口 + 玻璃空间 + 3D 实验室 + 数据星图 + 高级动效
```

用户进入网站时，第一眼应该看到：

- 大面积空间感
- 玻璃气泡和柔和光场
- 3D 背景或 3D 主物体
- 简短的“欢迎”
- 两个清晰按钮：“进入”和“联系我”

继续向下滚动后，网站逐渐展开：

- 3D Portal
- 内容星环
- 精选项目
- 最新文章
- Lab 动效预览
- Gallery 媒体墙
- Site Pulse 访问可视化
- Contact 联系区

### 1.2 视觉层级

页面视觉层级从强到弱：

1. Hero 3D 主视觉
2. 玻璃主卡片 / 玻璃入口
3. 重要 CTA 按钮
4. 文章 / 项目 / 媒体卡片
5. 数据可视化
6. 普通文字内容
7. 辅助链接和说明文字

首页视觉可以强，但文章详情页必须克制。

### 1.3 文字原则

首页首屏只保留极少文字：

```txt
欢迎
进入
联系我
```

首页后续区块也不写长段落，每个区块最多使用：

- 一个短标题
- 一句短说明
- 少量按钮或标签

详细内容应该进入二级页面：

- Blog
- Article Detail
- Projects
- Project Detail
- Lab
- Gallery
- About
- Archive
- Admin / Write
- Analytics

### 1.4 交互原则

SpaceLab 需要有明显交互感，不是静态展示页。交互包括：

- 鼠标移动光斑
- 按钮磁吸
- 玻璃按钮 hover 高光
- 液态玻璃切换
- 卡片 3D tilt
- 滚动触发动画
- 3D 物体视差
- 媒体卡片播放预览
- 访问数据动态增长
- 图表悬浮提示
- 移动端触摸反馈

交互必须服务体验，不允许为了炫酷牺牲可读性、性能和可维护性。

---

## 2. Page Experience

## 2.1 Home 首页

### 2.1.1 首页定位

Home 是 SpaceLab 的入口页，不是信息堆叠页。  
它的任务是制造第一印象，并引导用户进入内容空间。

### 2.1.2 首页结构

```txt
Home
  01 Hero 极简欢迎区
  02 Earth Observatory 地球科学与遥感展示区
  03 Neural Core 人工智能与大语言模型展示区
  04 Visual Systems 创意编程与数据可视化展示区
  05 Orbital Learning 科学学习与知识星图展示区
  06 Cockpit Dashboard 驾驶舱系统总控区
  07 Contact / Footer 轻量联系区
```

注：首页不再直接展示项目列表、文章列表、媒体墙和完整访问分析。这些内容应该进入二级页面（Projects、Blog、Gallery、Analytics），不要堆在首页。

### 2.1.3 Hero 极简欢迎区

内容：

```txt
欢迎

[进入] [联系我]
```

设计要求：

- 居中布局
- 大面积留白
- 背景有 3D 空间感
- 背景允许有气泡、粒子、光场
- 不展示技术栈
- 不展示文章
- 不展示项目
- 不展示访问数据
- 不出现复杂导航文案

按钮：

| 按钮   | 风格            | 行为                            |
| ------ | --------------- | ------------------------------- |
| 进入   | Google Blue CTA | 平滑滚动到 3D Portal 入口区     |
| 联系我 | Glass Button    | 跳转到 Contact 区或打开联系方式 |

Hero 首屏动效：

- 页面加载时 3D 光场缓慢浮现
- “欢迎”轻微 fade + blur reveal
- 两个按钮延迟出现
- 鼠标移动时背景 3D 层轻微 parallax
- 移动端降低 parallax 强度

### 2.1.4 3D Portal 入口区

作用：承接“进入”按钮，让用户感觉进入 SpaceLab。

表现：

- 中央有一个 3D Portal / 玻璃门 / 光环装置
- 周围有四个入口卡片：
  - Blog
  - Projects
  - Lab
  - Gallery
- 滚动进入时 Portal 缓慢打开
- 卡片从空间中浮现
- 点击卡片进入对应页面

入口卡片文字要短：

```txt
Blog
Projects
Lab
Gallery
```

每张入口卡最多一行辅助说明，不写长段落。

### 2.1.5 Content Orbit 内容星环区（二级页面内容）

注：此区块已从首页移除，现作为二级页面内容，可用于博客、项目等页面的导航。

作用：用 3D 或伪 3D 的方式展示网站内容结构。

内容节点：

```txt
Articles
Projects
Experiments
Media
About
Archive
```

视觉：

- 轨道环绕
- 节点像小星球或玻璃胶囊
- hover 时节点放大
- 当前节点发光
- 点击后进入页面
- 低性能设备可降级为横向滚动卡片

### 2.1.6 Featured Projects 精选项目区（二级页面内容）

注：此区块已从首页移除，现作为二级页面内容，在 Projects 页面展示精选项目。

展示 3 到 4 个精选项目。

卡片内容：

- 项目名称
- 一句话介绍
- 技术标签
- 封面图片 / GIF / 视频
- Preview 按钮
- Detail 按钮

样式：

- 大玻璃 Bento 卡片
- 支持视频封面静音循环
- hover spotlight 光斑
- 轻微 3D tilt
- 鼠标移出时平滑复位

### 2.1.7 Latest Articles 最新文章区（二级页面内容）

注：此区块已从首页移除，现作为二级页面内容，在 Blog 页面展示最新文章。

展示 3 到 6 篇最新文章。

卡片内容：

- 标题
- 一句摘要
- 标签
- 日期
- 封面图 / GIF / 视频封面

样式：

- 玻璃文章卡片
- 横向滑动或 Bento 排列
- hover 时边框和高光增强
- 文章列表不要挤满首页
- 点击进入 Article Detail

### 2.1.8 Lab Preview 动画实验预览区（二级页面内容）

注：此区块已从首页移除，现作为二级页面内容，在 Lab 页面展示交互动效和 3D 实验入口。

展示交互动效和 3D 实验入口。

建议 Demo：

- Liquid Glass Button
- Glass Segmented Control
- 3D Card Tilt
- Particle Field
- Scroll Camera
- Video Card
- Data Pulse
- Orbit Menu

样式：

- 小型动效卡片墙
- 卡片可播放 GIF / 视频 / Canvas
- hover 后浮起
- 点击进入 Lab 页面

### 2.1.9 Gallery Preview 媒体墙预览区（二级页面内容）

注：此区块已从首页移除，现作为二级页面内容，在 Gallery 页面展示精选图片、GIF、视频、3D 预览。

展示精选图片、GIF、视频、3D 预览。

视觉：

- Bento 网格
- 部分卡片更大
- 视频卡片可静音自动播放
- GIF 或 animated WebP 可直接展示
- 点击进入 Gallery 或打开媒体详情

### 2.1.10 Site Pulse 访问可视化概览区（二级页面内容）

注：此区块已从首页移除，现作为二级页面内容，在 Analytics 页面展示访问分析数据。

首页展示公开的轻量访问概览，不展示敏感信息。

内容：

- 总访问量
- 今日访问量
- 热门页面
- 热门文章
- 最近活跃内容
- 访问趋势概览

视觉：

- 玻璃数据卡片
- 发光折线图
- 粒子流
- 数据星图
- 数字动态递增
- 低性能设备降级为静态图表

### 2.1.11 Contact 底部联系区

内容：

- Contact
- Email
- GitHub
- 其他社交链接

视觉：

- 一个大玻璃卡片
- 背景气泡慢慢漂浮
- CTA 使用 Google Blue Button
- 次级链接使用 Glass Button

---

## 2.2 Blog 文章列表页

### 2.2.1 页面定位

Blog 是文章索引页，必须支持在线发布后的文章展示。

### 2.2.2 内容结构

```txt
Blog
  - 页面标题
  - 搜索框
  - 分类 / 标签筛选
  - 文章卡片网格
  - 分页或加载更多
```

### 2.2.3 文章卡片

文章卡片必须支持：

- 标题
- 摘要
- 标签
- 分类
- 日期
- 阅读量
- 封面图
- GIF 封面
- 视频封面

普通用户只看到 published 文章。

### 2.2.4 交互

- 搜索输入有玻璃输入框样式
- 分类切换使用 Liquid Glass Segmented Control
- 标签 hover 有轻微上浮
- 卡片 hover 有 spotlight
- 移动端改为单列卡片

---

## 2.3 Article Detail 文章详情页

### 2.3.1 页面定位

Article Detail 是阅读页面。它必须可读、稳定、清晰。  
这里不允许使用过重 3D 动画。

### 2.3.2 内容结构

```txt
Article Detail
  - 返回 Blog
  - 标题
  - 摘要
  - 日期
  - 标签
  - 阅读量
  - 封面媒体
  - Markdown 正文
  - 目录 TOC
  - 代码高亮
  - 图片 / GIF / 视频
  - 上一篇 / 下一篇
```

### 2.3.3 阅读体验

要求：

- 正文宽度控制在 760px - 860px
- 正文字号桌面端 17px 左右
- 行高 1.75 - 1.9
- 背景可以保留淡玻璃感
- 正文容器必须更接近实色，保证可读
- 移动端字号不低于 16px
- 代码块支持横向滚动
- 图片和视频不能撑破布局

### 2.3.4 媒体展示

文章内支持：

- 图片
- GIF
- animated WebP
- MP4
- WebM
- Lottie
- Rive

视频默认不自动播放，除非是封面短视频且静音。

---

## 2.4 Admin / Write 隐藏写作页

### 2.4.1 页面定位

Admin / Write 是隐藏页面，只给站长发布和编辑文章使用。  
它不是复杂后台，不放入普通导航。

### 2.4.2 设计原则

- 功能清晰
- 不做企业后台风
- 仍然保持 SpaceLab 的玻璃质感
- 表单区域要实用、对比度高
- 不为了炫酷影响写作效率

### 2.4.3 页面结构

```txt
Admin / Write
  - 登录 / 站长验证
  - 文章列表
  - 新建文章
  - 编辑文章
  - Markdown 编辑器
  - 实时预览
  - 封面上传
  - 图片 / GIF / 视频上传
  - 标签和分类设置
  - 草稿 / 发布切换
```

### 2.4.4 写作区布局

桌面端：

```txt
左侧：文章表单和 Markdown 编辑器
右侧：实时预览
顶部：保存草稿 / 发布 / 返回
```

移动端：

```txt
表单、编辑器、预览改为分段 Tab
避免左右分栏
```

---

## 2.5 Projects 项目展示页

### 2.5.1 页面定位

Projects 用于展示项目作品，不是 GitHub 链接列表。

### 2.5.2 项目卡片

必须支持：

- 项目名
- 一句话描述
- 技术标签
- 项目状态
- 封面图 / GIF / 视频
- GitHub 链接
- 在线预览链接
- 查看详情按钮

### 2.5.3 卡片风格

- 玻璃 Bento 卡片
- 视频封面可静音循环
- hover 轻微 3D tilt
- 重要项目卡片更大
- 标签使用轻玻璃胶囊

---

## 2.6 Project Detail 项目详情页

### 2.6.1 页面结构

```txt
Project Detail
  - 项目封面
  - 项目名称
  - 项目简介
  - 技术栈标签
  - 预览链接
  - GitHub 链接
  - 项目截图
  - 演示视频
  - 核心功能
  - 实现亮点
```

### 2.6.2 注意

项目详情可以比文章页更有视觉表现，但不能影响内容理解。

---

## 2.7 Lab / Playground 动画与 3D 实验室

### 2.7.1 页面定位

Lab 是 SpaceLab 的视觉实验室，用于展示炫酷交互、3D 动效和前端实验。

### 2.7.2 Demo 卡片

每个 Demo 包含：

- Demo 名称
- 技术标签
- 一句说明
- 预览图 / GIF / 视频 / Canvas
- 查看 Demo
- 查看源码

### 2.7.3 推荐 Demo

```txt
3D Portal
Glass Orb
Liquid Glass Button
Glass Segmented Control
3D Tilt Card
Particle Field
Scroll Camera
Data Pulse
Video Hover Card
Orbit Navigation
```

---

## 2.8 Gallery 媒体展示页

### 2.8.1 页面定位

Gallery 用于集中展示图片、GIF、视频和 3D 预览。

### 2.8.2 媒体类型

- Image
- GIF
- Video
- 3D Preview
- UI Motion
- Screenshot

### 2.8.3 布局

- Bento 网格
- 瀑布流可选
- 大卡 + 小卡组合
- 移动端单列或双列
- 点击媒体可打开 Lightbox

---

## 2.9 About 关于页

### 2.9.1 页面定位

About 只做基础个人信息，不做成长记录，不做学习时间线。

### 2.9.2 内容

- 简短介绍
- 当前方向
- 技能标签
- 联系方式
- GitHub
- Email
- 社交链接

### 2.9.3 禁止内容

- 成长记录
- 学习时间线
- 流水账经历
- 长篇自传

---

## 2.10 Archive 归档页

### 2.10.1 页面定位

Archive 用于按时间、分类、标签快速查找文章。

### 2.10.2 结构

- 年份
- 月份
- 文章标题
- 标签
- 分类
- 搜索入口

视觉保持简洁，不能比 Blog 页更复杂。

---

## 2.11 Analytics / Admin Analytics 访问分析页

### 2.11.1 页面定位

Analytics 是隐藏访问分析页，不放入普通导航。

### 2.11.2 内容

- PV
- UV
- 今日访问
- 本周访问
- 本月访问
- 热门页面
- 热门文章
- 访问趋势
- 设备类型
- 浏览器类型
- 媒体播放统计
- 按钮点击统计

### 2.11.3 视觉

- 玻璃仪表盘
- 数据卡片
- 发光折线图
- 环形图
- 热力图
- 访问星图
- 粒子流

---

## 3. Visual System

## 3.1 色彩系统

所有颜色必须通过 CSS Variables 管理。

```css
:root {
  --color-bg: #e8e3d8;
  --color-bg-soft: #f3efe7;
  --color-surface: rgba(255, 255, 255, 0.46);
  --color-surface-strong: rgba(255, 255, 255, 0.72);
  --color-text: #171717;
  --color-text-secondary: rgba(23, 23, 23, 0.66);
  --color-text-tertiary: rgba(23, 23, 23, 0.44);

  --color-google-blue: #1a73e8;
  --color-google-blue-hover: #1765cc;
  --color-google-blue-active: #1558b0;

  --color-accent-yellow: #ffd21f;
  --color-cyan: #69d7ff;
  --color-violet: #8f7cff;
  --color-rose: #f3b9c8;

  --glass-bg: rgba(255, 255, 255, 0.36);
  --glass-bg-strong: rgba(255, 255, 255, 0.58);
  --glass-border: rgba(255, 255, 255, 0.58);
  --glass-border-hover: rgba(255, 255, 255, 0.84);
  --glass-shadow: 0 28px 80px rgba(34, 28, 18, 0.18);
  --glass-inner: inset 0 1px 0 rgba(255, 255, 255, 0.62);

  --radius-xs: 8px;
  --radius-sm: 12px;
  --radius-md: 18px;
  --radius-lg: 26px;
  --radius-xl: 34px;
  --radius-pill: 999px;

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### 3.2 背景

全站默认背景为浅色暖灰 + 液态玻璃 + 柔和光斑，不是纯黑背景。

允许深色背景的只有局部沉浸 WebGL 区、驾驶舱区、实验区。

不允许所有 section 都是黑色背景。

不允许所有卡片都做成暗黑 HUD 面板。

不允许背景粒子过亮、过密、过曝。

默认背景 CSS：

```css
.app-shell {
  min-height: 100vh;
  background:
    radial-gradient(circle at 18% 12%, rgba(255, 210, 31, 0.24), transparent 28%),
    radial-gradient(circle at 82% 18%, rgba(105, 215, 255, 0.18), transparent 30%),
    radial-gradient(circle at 72% 78%, rgba(143, 124, 255, 0.16), transparent 32%),
    linear-gradient(135deg, var(--color-bg-soft), var(--color-bg));
}
```

---

## 4. Button System

### 4.1 Google Blue Button

用于主要操作：

- 进入
- 发布
- 保存
- 查看项目
- 联系我主 CTA

```css
.button-google {
  min-height: 46px;
  padding: 0 24px;
  border: 1px solid rgba(26, 115, 232, 0.18);
  border-radius: var(--radius-pill);
  background: var(--color-google-blue);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 12px 28px rgba(26, 115, 232, 0.28);
  transition:
    transform 240ms var(--ease-out),
    box-shadow 240ms var(--ease-out),
    background 240ms var(--ease-out);
}

.button-google:hover {
  background: var(--color-google-blue-hover);
  transform: translateY(-2px);
  box-shadow: 0 18px 42px rgba(26, 115, 232, 0.34);
}

.button-google:active {
  background: var(--color-google-blue-active);
  transform: translateY(0) scale(0.98);
}
```

### 4.2 Glass Button

用于次级操作：

- 联系我
- 查看更多
- 返回
- 过滤器
- 次要链接

```css
.button-glass {
  min-height: 46px;
  padding: 0 22px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-pill);
  background: rgba(255, 255, 255, 0.34);
  color: var(--color-text);
  font-weight: 700;
  backdrop-filter: blur(14px) saturate(135%);
  -webkit-backdrop-filter: blur(14px) saturate(135%);
  box-shadow:
    0 12px 30px rgba(34, 28, 18, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.58);
  transition:
    transform 240ms var(--ease-out),
    background 240ms var(--ease-out),
    border-color 240ms var(--ease-out),
    box-shadow 240ms var(--ease-out);
}

.button-glass:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.54);
  border-color: var(--glass-border-hover);
}
```

### 4.3 多色轻玻璃按钮

允许轻度搭配颜色，但不能让透明玻璃感消失。

允许色：

```css
.button-glass.is-blue {
  background: rgba(26, 115, 232, 0.14);
}

.button-glass.is-yellow {
  background: rgba(255, 210, 31, 0.18);
}

.button-glass.is-violet {
  background: rgba(143, 124, 255, 0.14);
}

.button-glass.is-rose {
  background: rgba(243, 185, 200, 0.16);
}
```

不允许：

- 大面积实心渐变
- 高饱和霓虹色
- 透明度过低导致玻璃感消失
- hover 变成完全不透明

### 4.4 Liquid Glass Segmented Control

用于：

- Blog 分类切换
- Gallery 类型切换
- Analytics 时间范围切换
- Admin 编辑/预览切换
- 中英文切换

视觉：

- 半透明玻璃轨道
- 当前选项有液态玻璃滑块
- 点击时滑块平滑移动
- 拖拽时有轻微拉伸
- 松手吸附到最近选项
- 移动端支持触摸拖拽

状态：

- default
- hover
- active
- dragging
- disabled
- focus-visible

---

## 5. Component System

### 5.1 Glass Card

基础玻璃卡片用于：

- 文章卡
- 项目卡
- 媒体卡
- 数据卡
- Portal 入口卡
- 联系卡

规则：

- border-radius 使用 `--radius-xl`
- 背景使用 `--glass-bg`
- 边框使用 `--glass-border`
- 阴影使用 `--glass-shadow`
- backdrop-filter 不超过 14px
- 大量列表卡片不要使用过高 blur，移动端可关闭 blur

### 5.2 Spotlight Card

用于 hover 时产生鼠标跟随光斑。

要求：

- 光斑必须 pointer-events: none
- 鼠标移出时平滑消失
- 移动端禁用跟随光斑
- 不可影响卡片内容可读性

### 5.3 Blog Card

必须支持：

- image cover
- gif cover
- video cover
- title
- summary
- tags
- date
- view count

### 5.4 Media Card

必须支持：

- 图片
- GIF
- 视频
- hover preview
- lightbox
- caption
- type badge

### 5.5 Analytics Card

必须支持：

- 数字
- 趋势
- 小图表
- loading skeleton
- empty state
- error state

---

## 6. 3D & Motion

### 6.1 动效等级

SpaceLab 使用 L3 immersive 动效，但必须有降级。

允许：

- WebGL 3D
- 3D Portal
- 轨道星环
- 粒子场
- 滚动触发相机动画
- 卡片 3D tilt
- 液态玻璃按钮切换
- 数据可视化动态效果

限制：

- 首页可以重
- Lab 可以重
- Gallery 可以中等
- Projects 可以中等
- Article Detail 必须轻
- Admin / Write 必须实用优先
- 移动端必须降级

### 6.2 3D 使用原则

- 首页最多 1 到 2 个真实 WebGL 场景。
- Article Detail 不放重 WebGL。
- Admin / Write 不放重 WebGL。
- 3D 场景离开视口必须暂停。
- 组件销毁时必须释放 geometry、material、texture、renderer。
- 移动端可以使用静态 poster 或 CSS 伪 3D 替代。

### 6.3 Scroll Animation

允许：

- fade up
- blur reveal
- parallax
- pin section
- card convergence
- scroll-driven 3D camera

禁止：

- 页面滚动失控
- 文章页滚动被劫持
- 低端设备强制运行复杂 pin
- 滚动动画导致内容不可点击

### 6.4 Reduced Motion

必须支持：

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 7. Typography

### 7.1 字体

建议字体：

```css
:root {
  --font-sans:
    'Noto Sans SC', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-display: 'Noto Sans SC', 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
}
```

### 7.2 字号规则

| 场景          |       桌面端 |      移动端 |
| ------------- | -----------: | ----------: |
| Hero 欢迎     | 72px - 112px | 44px - 64px |
| Section Title |  36px - 64px | 28px - 40px |
| Card Title    |  22px - 34px | 20px - 26px |
| Body          |  16px - 17px |        16px |
| Article Body  |         17px |        16px |
| Label         |  12px - 14px |        12px |

### 7.3 中英文

项目必须支持中英文内容。  
设计上要保证中文和英文都好看。

要求：

- 中文不允许只依赖英文字体回退。
- 中英文按钮宽度要自适应。
- 中英文切换不能造成布局明显跳动。
- 内容较长的英文标题需要允许换行。
- 中文标题不能过紧，letter-spacing 不要过度负值。

---

## 8. Media Display

### 8.1 支持类型

必须支持：

- JPG
- PNG
- WebP
- AVIF
- GIF
- animated WebP
- MP4
- WebM
- Lottie JSON
- Rive
- GLB / GLTF

### 8.2 视频展示

视频卡片规则：

- 封面视频可以 muted loop autoplay。
- 正文视频默认 controls。
- 移动端禁止同时自动播放大量视频。
- 懒加载视频资源。
- 视频必须有 poster。

### 8.3 Gallery 媒体墙

视觉要求：

- 图片、GIF、视频混排
- type badge 明确媒体类型
- hover 放大不能裁掉重要内容
- Lightbox 支持键盘关闭
- 移动端手势友好

---

## 9. Data Visualization

### 9.1 Site Pulse 首页概览

首页只展示概览：

- 总访问
- 今日访问
- 热门页面
- 热门文章
- 访问趋势

表现方式：

- 玻璃数据卡
- 发光折线
- 数字动态递增
- 粒子流点缀

### 9.2 Analytics 隐藏页

Analytics 页面可以展示更完整数据：

- PV / UV
- 访问趋势
- 页面排行
- 文章排行
- 设备分布
- 浏览器分布
- 媒体播放
- 按钮点击

图表风格：

- 背景透明或玻璃
- 线条发光但不刺眼
- 图例清晰
- tooltip 要可读
- 移动端图表横向滚动或简化

---

## 10. Responsive Design

### 10.1 断点

```txt
Desktop: >= 1200px
Laptop: 992px - 1199px
Tablet: 768px - 991px
Mobile: < 768px
Small Mobile: < 480px
```

### 10.2 移动端规则

移动端必须：

- 首页首屏完整显示“欢迎”和两个按钮
- 3D 降级或减弱
- 卡片改为单列或双列
- Admin 写作页不使用左右分栏
- Article 正文宽度占满可用空间
- 字体不小于 16px
- 所有按钮触控高度不低于 44px
- 禁止横向溢出
- 视频和图片最大宽度 100%
- 导航折叠为移动端菜单

### 10.3 3D 移动端降级

移动端默认：

- 降低 DPR
- 减少粒子数量
- 减少后期处理
- 禁用复杂 ScrollTrigger pin
- 必要时使用静态 poster 替代 WebGL

---

## 11. Do / Don't

### 11.1 Do

- Do 保持首页首屏极简。
- Do 保留首页下面的炫酷内容。
- Do 使用玻璃、3D、光场和数据可视化形成统一风格。
- Do 让文章页清晰可读。
- Do 让 Admin 写作页好用。
- Do 做好中英文适配。
- Do 做好移动端适配。
- Do 每个交互都写清楚状态。
- Do 每完成阶段就提交并推送远端。

### 11.2 Don't

- Don't 在首页首屏写技术栈和长介绍。
- Don't 做成长记录和学习时间线。
- Don't 把写作页做成复杂企业后台。
- Don't 让玻璃按钮变成完全不透明色块。
- Don't 在文章页放重 3D。
- Don't 移动端强行跑所有桌面端动画。
- Don't 在组件里乱写硬编码颜色。
- Don't 写不可维护的一次性代码。
- Don't 完成一大堆内容后才提交。
