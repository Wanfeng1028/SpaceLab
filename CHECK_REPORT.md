# SpaceLab 项目检查报告

## 一、Angular Material 使用情况

### About / 关于我：

- 是否安装 Angular Material：✅ 已安装（@angular/material@^21.2.12, @angular/cdk@^21.2.12）
- about.component.ts 是否导入 MatCardModule / MatChipsModule / MatButtonModule / MatIconModule / MatDividerModule / MatDialogModule / MatSnackBarModule / MatTooltipModule：✅ 全部导入
- about.component.html 是否真实使用 mat-card / mat-chip / mat-divider / mat-icon / MatDialog：✅ 使用 mat-card、mat-chip-set、mat-chip、mat-divider、mat-icon；通过 MatDialog service 打开联系弹窗
- 当前问题：✅ 无，符合要求

### AI Frontline / AI 前线：

- 是否安装 Angular Material：✅ 已安装
- ai-frontline.component.ts 是否导入 MatCardModule / MatChipsModule / MatSidenavModule / MatListModule / MatIconModule / MatDividerModule / MatTooltipModule / MatProgressSpinnerModule：❌ 缺少 MatSidenavModule、MatProgressSpinnerModule
- ai-frontline.component.html 是否真实使用 mat-card / mat-chip / mat-drawer 或 mat-sidenav / mat-nav-list / mat-list-item：✅ 使用 mat-card、mat-chip-set、mat-chip、mat-nav-list、mat-list-item、mat-divider；❌ 未使用 mat-drawer-container 或 mat-sidenav-container，使用 aside + div 实现三栏布局
- 当前布局问题：搜索框已居中；分类已放入左侧 mat-nav-list（非裸文本）；但布局未使用 mat-drawer-container，不符合要求
- 当前问题：需迁移到 mat-drawer-container 实现三栏布局

### Lab / AI 资源实验室：

- 是否安装 Angular Material：✅ 已安装
- lab.component.ts 是否导入 MatCardModule / MatChipsModule / MatSidenavModule / MatListModule / MatIconModule / MatDividerModule / MatTooltipModule / MatProgressSpinnerModule / MatButtonToggleModule：❌ 缺少 MatSidenavModule、MatProgressSpinnerModule；✅ 已导入 MatButtonToggleModule
- lab.component.html 是否真实使用 mat-card / mat-chip / mat-drawer 或 mat-sidenav / mat-nav-list / mat-list-item：✅ 使用 mat-card、mat-chip-set、mat-chip、mat-nav-list、mat-list-item、mat-button-toggle-group、mat-button-toggle；❌ 未使用 mat-drawer-container 或 mat-sidenav-container
- 当前布局问题：模块切换使用 mat-button-toggle-group（符合要求）；分类已放入 mat-nav-list；但布局未使用 mat-drawer-container
- 当前问题：需迁移到 mat-drawer-container 实现三栏布局

## 二、AI-bot 数据同步情况

### AI Frontline:

- src/content/ai-frontline/news.json 是否来自 https://ai-bot.cn/daily-ai-news/：✅ 是，数据与页面对应
- 是否包含 2026-05-25 至今历史数据：✅ 是，数据覆盖 2026-05-25 至 2026-05-29
- 是否有手写 / 模拟 / 非 AI-bot 数据：❌ 存在部分 ID 生成问题（如 "2026-05-29-runway-推出-runway-mcp-服务器" 日期为 2026-05-28）
- 是否有错误 date：⚠️ 部分条目 date 与 ID 前缀日期不一致（ID 用了抓取当天，实际 date 为内容日期）
- 是否有用 fetchedAt 当 date 的情况：❌ 未发现，date 字段解析自页面日期分组
- 是否有 id 使用抓取日期而不是真实内容日期的问题：⚠️ 部分 ID 使用了 2026-05-29 前缀，但实际 date 为 2026-05-28/27/26/25
- 当前问题：ID 生成规则需严格按 `date-slug`；需修复部分 ID 前缀错误

### Lab AI Tools:

- src/content/lab/ai-tools.json 是否来自 https://ai-bot.cn/ai-tools/：✅ 是，但包含模拟数据
- 是否完整：⚠️ 包含模拟数据（ID 如 t28_01、t28_02 等），需要清理
- source 是否为空：✅ source 字段均为 "ai-bot.cn"
- date 是否规范：⚠️ 部分 date 为模拟日期（如 2026-05-28T08:00:00Z），部分 publishedAt 为空
- 当前问题：存在模拟数据（如 DeepSeek V4、Hailuo Video 2.0 等），需要移除非 AI-bot 来源数据

### Lab AI Projects:

- src/content/lab/ai-projects.json 是否来自 https://ai-bot.cn/ai-research/：✅ 是，但包含模拟数据
- 是否混入模拟数据：✅ 是，存在模拟数据（ID 如 p28_01、p28_02 等）
- 是否完整：⚠️ 包含模拟数据
- source 是否为空：✅ source 字段均为 "ai-bot.cn"
- date 是否规范：⚠️ 部分 date 为模拟日期
- 当前问题：存在模拟数据（如 Anthropic Claude Agent SDK、Stability AI SDXL Turbo 2 等），需要移除非 AI-bot 来源数据

## 三、About 更新方式

- 当前 About 内容哪些来自 profile.json：✅ 名字、头像、GitHub、邮箱
- 当前 About 内容哪些写死在 about.component.ts：⚠️ identityLabels、focusAreas、spacelabModules 数组硬编码在组件中；内容通过 i18n 系统读取翻译 key
- 是否需要新增 src/content/about.json：✅ 需要，将 Hero 文案、身份标签、关注方向、SpaceLab 模块、CTA 文案等配置化
- build-content.mjs 是否需要支持 about.json：✅ 需要，读取 about.json 并生成 ABOUT 常量
- 需要修复项：
  1. 新增 src/content/about.json，结构如用户指定
  2. 修改 scripts/build-content.mjs，读取 about.json 并生成 ABOUT 常量
  3. 修改 about.component.ts，从 PROFILE 和 ABOUT 读取内容，移除硬编码数组
  4. 修改 about.html，使用 about.json 中的数据渲染

## 四、其他发现

1. **搜索框样式**：已保留原有胶囊样式，未使用 Material 输入框，符合反馈要求。
2. **移动端适配**：AI Frontline 和 Lab 已有移动端横向 chips 布局，但需要验证是否无横向滚动。
3. **i18n**：模板中使用 `t()` 函数，但部分 key 可能未定义（如 `resourceInbox.contentSince`），需检查。
4. **数据字段**：AI Frontline 使用 `summary`，Lab 使用 `summary`（部分使用 `description`），需要统一。
5. **日期范围筛选**：默认已设置为 'all'，符合要求。
6. **同步脚本**：已实现合并逻辑，不会覆盖历史数据，但存在 ID 生成问题。

## 五、修复优先级

### 高优先级：

1. 清理 Lab 数据中的模拟数据（t28_01、p28_01 等）
2. 修复 AI Frontline ID 生成规则，确保 ID 使用真实内容日期
3. 迁移 AI Frontline 和 Lab 布局到 mat-drawer-container
4. 新增 about.json 并修改 build-content.mjs 和 About 组件

### 中优先级：

5. 补充缺失的 Material 模块导入（MatSidenavModule、MatProgressSpinnerModule）
6. 统一 Lab 数据字段（summary vs description）
7. 检查并修复 i18n 缺失 key
8. 验证移动端适配

### 低优先级：

9. 优化同步脚本的 date 解析逻辑
10. 增强错误处理（网络失败时保留旧数据）

---

报告生成时间：2026-05-29
