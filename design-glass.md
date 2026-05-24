# Glass Design System — 磨砂玻璃设计规范

> PlanningGo "周末有谱" 玻璃拟态（Glassmorphism）视觉体系。  
> Mixin 源文件：`src/styles/_glass.scss`

---

## 1. 设计理念

磨砂玻璃是本项目的核心视觉语言，贯穿导航栏、卡片、模态框、Toast 等所有浮层组件。  
目标效果：**半透明 + 模糊背景 + 微渐变 + 柔和光晕 = 温暖的毛玻璃质感**。

品牌色体系以奶白 `#f7f1e7` 为底，黄色 `#ffcc33` 为品牌强调色，  
玻璃层通过 CSS 自定义属性 `--color-brand-rgb` 引入品牌色光晕。

---

## 2. Mixin 体系总览

`src/styles/_glass.scss` 提供 **8 个 mixin**，分为三层：

| 层级 | Mixin | 用途 |
|------|-------|------|
| **卡片底座** | `glass-card-base` | 核心玻璃层：边框、渐变背景、blur、阴影 |
| **卡片装饰** | `glass-card-light` | `::before` 顶部高光 |
| | `glass-card-glow` | `::after` 底部品牌色光晕 |
| **卡片交互** | `glass-card-hover` | hover 上浮 + 阴影增强 |
| | `glass-card-active` | 选中/激活状态 |
| **卡片布局** | `glass-card-content-layer` | 子元素 z-index 置顶 |
| **面板底座** | `glass-surface` | 轻量版 base，无 border-radius |
| **面板交互** | `glass-surface-hover` | 轻量 hover（-1px） |

---

## 3. 核心 Mixin 详解

### 3.1 `glass-card-base` — 卡片玻璃底座

```scss
@mixin glass-card-base {
  position: relative;
  isolation: isolate;
  border: 1px solid rgb(255 255 255 / 0.46);
  border-radius: 30px;
  background:
    linear-gradient(148deg,
      rgb(255 255 255 / 0.22) 0%,
      rgb(255 255 255 / 0.1) 48%,
      rgb(255 255 255 / 0.05) 100%),
    rgb(255 255 255 / 0.04);
  box-shadow:
    0 14px 34px rgb(var(--color-text-primary-rgb) / 0.06),
    inset 0 1px 0 rgb(255 255 255 / 0.62),
    inset 0 -1px 0 rgb(255 255 255 / 0.12);
  backdrop-filter: blur(26px) saturate(1.2);
  -webkit-backdrop-filter: blur(26px) saturate(1.2);
  overflow: hidden;
  transition: transform 180ms var(--ease-out),
              box-shadow 180ms var(--ease-out),
              border-color 180ms var(--ease-out),
              background 180ms var(--ease-out);
}
```

**关键参数：**

| 属性 | 值 | 说明 |
|------|-----|------|
| `border` | `1px solid rgb(255 255 255 / 0.46)` | 半透明白边，模拟光线折射 |
| `border-radius` | `30px` | 大圆角，项目统一风格 |
| `background` | 双层：渐变 + 纯色 | 148° 方向渐变白→透，底部纯白底 |
| `box-shadow` | 3 层 | 外阴影 + 内顶部高光 + 内底部暗线 |
| `backdrop-filter` | `blur(26px) saturate(1.2)` | 核心模糊效果，26px 半径 + 饱和度提升 |
| `overflow` | `hidden` | 裁剪伪元素溢出 |

### 3.2 `glass-card-light` — 顶部高光层

用于 `::before` 伪元素：

```scss
@mixin glass-card-light {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 18% 12%,
      rgb(255 255 255 / 0.62), transparent 24%),
    linear-gradient(135deg,
      rgb(255 255 255 / 0.18), transparent 42%);
  opacity: 0.88;
}
```

效果：左上角圆形光斑 + 对角线渐变，模拟玻璃表面反射。

### 3.3 `glass-card-glow` — 品牌色光晕

用于 `::after` 伪元素：

```scss
@mixin glass-card-glow {
  content: "";
  position: absolute;
  inset: auto -8% -24% 38%;
  height: 50%;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(circle,
    rgb(var(--color-brand-rgb) / 0.1) 0%,
    rgb(255 255 255 / 0.03) 54%,
    transparent 100%);
  filter: blur(18px);
  opacity: 0.56;
  transform: rotate(-10deg);
}
```

效果：卡片底部偏右的品牌色（黄色）柔光，通过 `blur(18px)` 散射。

### 3.4 `glass-card-hover` — 悬浮交互

```scss
@mixin glass-card-hover {
  transform: translateY(-3px);
  border-color: rgb(255 255 255 / 0.58);
  box-shadow:
    0 18px 40px rgb(var(--color-text-primary-rgb) / 0.08),
    inset 0 1px 0 rgb(255 255 255 / 0.72),
    inset 0 -1px 0 rgb(255 255 255 / 0.12);
}
```

效果：上浮 3px + 阴影加深 + 边框提亮。

### 3.5 `glass-card-active` — 选中状态

```scss
@mixin glass-card-active {
  border-color: rgb(var(--color-brand-rgb) / 0.45);
  background:
    linear-gradient(148deg,
      rgb(255 255 255 / 0.26) 0%,
      rgb(255 255 255 / 0.12) 48%,
      rgb(var(--color-brand-rgb) / 0.06) 100%),
    rgb(var(--color-brand-rgb) / 0.04);
  box-shadow:
    0 14px 34px rgb(var(--color-text-primary-rgb) / 0.06),
    0 0 0 1px rgb(var(--color-brand-rgb) / 0.12),
    inset 0 1px 0 rgb(255 255 255 / 0.62),
    inset 0 -1px 0 rgb(255 255 255 / 0.12);
}
```

效果：边框泛品牌色 + 背景渐变融入品牌色 + 外发光。

### 3.6 `glass-card-content-layer` — 内容层保护

```scss
@mixin glass-card-content-layer {
  > * {
    position: relative;
    z-index: 1;
  }
}
```

确保子元素渲染在 `::before` / `::after` 伪元素之上。

### 3.7 `glass-surface` — 面板/导航底座

与 `glass-card-base` 参数完全一致，但**不含 `border-radius` 和 `min-height`**，  
适用于导航栏、侧边面板等非卡片容器。

### 3.8 `glass-surface-hover` — 轻量悬浮

与 `glass-card-hover` 类似，但上浮量更小（`-1px` vs `-3px`），  
用于导航栏等需要更克制交互反馈的场景。

---

## 4. 标准使用模式

### 4.1 卡片组件（标准三件套）

```scss
@use "../styles/glass" as glass;

.card {
  @include glass.glass-card-base;
  @include glass.glass-card-content-layer;
  /* 自定义：padding, min-height 等 */
}

.card::before {
  @include glass.glass-card-light;
}

.card::after {
  @include glass.glass-card-glow;
}

.card:hover {
  @include glass.glass-card-hover;
}
```

### 4.2 导航栏 / 面板

```scss
@use "../styles/glass" as glass;

.nav {
  @include glass.glass-surface;
  border-radius: var(--radius-pill);
}

.nav::before {
  @include glass.glass-card-light;
}

.nav::after {
  @include glass.glass-card-glow;
  opacity: 0.38;  /* 光晕更淡 */
}

.nav:hover {
  @include glass.glass-surface-hover;
}
```

### 4.3 模态框

```scss
@use "../styles/glass" as glass;

.overlay {
  position: fixed;
  inset: 0;
  backdrop-filter: blur(6px);
  background: rgb(0 0 0 / 0.12);
}

.modal {
  @include glass.glass-card-base;
  border-radius: 24px;
}

.modal::before {
  @include glass.glass-card-light;
}

.modal::after {
  @include glass.glass-card-glow;
}
```

---

## 5. 各组件使用一览

| 组件 | 使用的 Mixin | 特殊参数 |
|------|-------------|---------|
| **NavBar** | `glass-surface` + `glass-card-light` + `glass-card-glow` + `glass-surface-hover` | `border-radius: pill`，光晕 opacity 0.38 |
| **BottomTabs** | 直接写 `backdrop-filter: blur(10px)` | 移动端底栏，未用 mixin |
| **GlassToast** | `glass-card-base` + `glass-card-light` + `glass-card-glow` | `border-radius: 22px`，光晕 opacity 0.32 |
| **AuthModal** | `glass-card-base` + `glass-card-light` + `glass-card-glow` | 遮罩 `blur(6px)`，内嵌卡片 `blur(8px)` |
| **FeatureModal** | `glass-card-base` + `glass-card-light` + `glass-card-glow` | 遮罩 `blur(18px) saturate(1.3)` |
| **WorkspaceModal** | `glass-card-base` + `glass-card-light` + `glass-card-glow` | 遮罩 `blur(18px)`，面板 `blur(26px)` |
| **ProfilePage** | `glass-card-base` + `glass-card-light` + `glass-card-glow` + `glass-card-content-layer` | `.glassCard` 通用类 |
| **Pages (首页)** | `glass-card-base` + 全套 | `.designCard` / `.whyChooseCard` / `.routeOverviewBoard` |
| **FlowPage** | `glass-card-base` + 全套 + `glass-card-hover` | 5 个独立玻璃卡片 |
| **FeaturesPage** | 混用 mixin + 手写 blur | 值范围 `8px` ~ `24px` |
| **CasesPage** | `glass-card-base` + `glass-card-light` + `glass-card-glow` | 案例卡片 + 标签区 |
| **DevelopersPage** | `glass-card-base` + `glass-card-light` + `glass-card-glow` + `glass-card-hover` | 7 个独立玻璃区块 |

---

## 6. Blur 强度等级参考

项目中 `backdrop-filter: blur()` 的取值分布：

| 等级 | Blur 值 | Saturate | 使用场景 |
|------|---------|----------|---------|
| **极轻** | `2px` ~ `6px` | — | 背景遮罩层、辅助提示 |
| **轻** | `8px` ~ `12px` | — | Toast 弹窗、小模态框内层、底栏 |
| **中** | `16px` ~ `20px` | `1.2` ~ `1.3` | 模态框遮罩、功能卡片 |
| **标准** | `22px` ~ `26px` | `1.16` ~ `1.35` | 主卡片、导航栏、核心玻璃层 |
| **强** | `28px` | `1.5` | 案例页焦点卡片 |

> **建议：** 新组件统一使用 mixin 中的 `blur(26px) saturate(1.2)` 标准值，  
> 仅在视觉层次需要区分时调整。

---

## 7. 装饰性 blur（非 backdrop-filter）

以下场景使用 `filter: blur()` 做装饰效果，与磨砂玻璃无关：

| 场景 | 值 | 说明 |
|------|-----|------|
| 背景渐变色块 | `blur(60px)` ~ `blur(80px)` | 大面积柔光装饰 |
| 入场动画 | `blur(6px)` ~ `blur(8px)` | fadeIn 初始态 |
| 光晕散射 | `blur(16px)` ~ `blur(22px)` | 品牌色光球 |

---

## 8. CSS 自定义属性依赖

玻璃系统依赖以下 CSS 变量（定义在全局样式中）：

```css
--color-brand-rgb        /* 品牌色 RGB，如 255 204 51 */
--color-text-primary-rgb /* 主文字色 RGB，用于阴影透明度 */
--color-brand            /* 品牌色，如 #ffcc33 */
--ease-out               /* 缓出曲线 */
--radius-pill            /* 胶囊圆角，用于导航栏 */
```

---

## 9. 新组件 Checklist

创建新的磨砂玻璃组件时，确认以下事项：

- [ ] 使用 `@use "../styles/glass" as glass;` 引入 mixin
- [ ] 底座使用 `glass-card-base` 或 `glass-surface`
- [ ] `::before` 使用 `glass-card-light`
- [ ] `::after` 使用 `glass-card-glow`，可按需调整 `opacity`
- [ ] 使用 `glass-card-content-layer` 保护子元素层级
- [ ] 可交互卡片添加 `glass-card-hover`，面板用 `glass-surface-hover`
- [ ] 同时提供 `-webkit-backdrop-filter` 兼容写法（mixin 已内置）
- [ ] 移动端考虑降低 blur 值以提升性能
