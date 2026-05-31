# agy-hud 维护者文档索引

> 本目录包含面向维护者的技术文档，与 v0.3.3 代码库严格对齐。

## 文档列表

| 文档 | 内容 |
|---|---|
| [architecture.md](architecture.md) | 系统架构：两层设计、模块依赖图、执行流程、数据流 |
| [module-reference.md](module-reference.md) | 每个模块的 API、函数签名、行为说明 |
| [install-and-lifecycle.md](install-and-lifecycle.md) | 安装流程、bootstrap 机制、升级、卸载、目录布局 |
| [quota-and-cache.md](quota-and-cache.md) | Quota API、SWR 缓存机制、令牌发现、错误状态 |
| [rendering-and-styling.md](rendering-and-styling.md) | ANSI 渲染管线、配色、字形、HUD 每行结构 |
| [config-reference.md](config-reference.md) | 配置 Schema 全字段参考、主题预设、环境变量 |
| [testing-and-ci.md](testing-and-ci.md) | 单元测试覆盖、E2E 测试、CI 流水线、实现陷阱 |
| [windows-specifics.md](windows-specifics.md) | Windows 令牌发现、.cmd shim、sh shim、UTF-8 设置 |
| [maintainer-guide.md](maintainer-guide.md) | 常见维护任务、发版流程、调试、不变量 |

---

## 快速导航

### 我想了解整体架构
→ [architecture.md](architecture.md) — 两层设计、执行流程图、数据流

### 我要修改某个模块
→ [module-reference.md](module-reference.md) — 每个文件的函数签名和行为

### 安装/引导流程出了问题
→ [install-and-lifecycle.md](install-and-lifecycle.md) — bootstrap 步骤、目录布局、幂等性

### quota 显示不正确
→ [quota-and-cache.md](quota-and-cache.md) — API、SWR、令牌发现、调试命令

### HUD 显示异常（字符乱码、颜色错误）
→ [rendering-and-styling.md](rendering-and-styling.md) — 渲染管线、字形选择、ANSI 颜色

### 配置选项说明
→ [config-reference.md](config-reference.md) — 所有字段、类型、默认值

### 跑测试 / CI 失败
→ [testing-and-ci.md](testing-and-ci.md) — 单元测试、E2E、CI 步骤、常见陷阱

### Windows 相关问题
→ [windows-specifics.md](windows-specifics.md) — Credential Manager、.cmd shim、UTF-8

### 发版 / 日常维护
→ [maintainer-guide.md](maintainer-guide.md) — 发版流程、调试、不变量

---

## 关键不变量（维护时必读）

1. **`gemini-extension.json` 不得删除** — `agy plugin install` 强制校验
2. **statusline 热路径不得阻塞网络** — quota SWR 必须纯缓存
3. **`writeCache` 必须原子写** — `tmp + rename` 防并发截断
4. **单元测试通过 ≠ 完成** — E2E 才是完成门槛
5. **bootstrap 必须幂等** — 可重复执行，不累积状态
6. **卸载不得删除第三方 shim** — 按内容匹配才删除

---

## 代码与文档对应表

| 源文件 | 对应文档章节 |
|---|---|
| `runtime/bin/agy-hud.js` | [module-reference.md#entrypoint](module-reference.md), [architecture.md#execution-flow](architecture.md) |
| `runtime/parser.js` | [module-reference.md#parserjs](module-reference.md) |
| `runtime/quota.js` | [module-reference.md#runtimequotajs-—-quota--token-orchestrator](module-reference.md), [quota-and-cache.md](quota-and-cache.md) |
| `runtime/quota/token.js` | [module-reference.md#runtimequotatokenjs-—-token-discovery](module-reference.md), [quota-and-cache.md#token-discovery-details](quota-and-cache.md) |
| `runtime/quota/cache.js` | [module-reference.md#runtimequotacachejs-—-quota-cache--keying](module-reference.md), [quota-and-cache.md#cache](quota-and-cache.md) |
| `runtime/quota/cloud.js` | [module-reference.md#runtimequotacloudjs-—-api-clients](module-reference.md), [quota-and-cache.md#api-endpoints](quota-and-cache.md) |
| `runtime/quota/models.js` | [module-reference.md#runtimequotamodelsjs-—-quota-model-normalization](module-reference.md), [quota-and-cache.md#response-normalization](quota-and-cache.md) |
| `runtime/renderer.js` | [module-reference.md#runtimerendererjs-—-hud-layout--rendering-orchestrator](module-reference.md), [rendering-and-styling.md](rendering-and-styling.md) |
| `runtime/renderer/format.js` | [module-reference.md#runtimerendererformatjs-—-formatting-helpers](module-reference.md), [rendering-and-styling.md](rendering-and-styling.md) |
| `runtime/renderer/lang.js` | [module-reference.md#runtimerendererlangjs-—-internationalization](module-reference.md), [rendering-and-styling.md#language-support](rendering-and-styling.md) |
| `runtime/renderer/quota-render.js` | [module-reference.md#runtimerendererquota-renderjs-—-配额渲染器](module-reference.md), [rendering-and-styling.md](rendering-and-styling.md) |
| `runtime/config.js` | [module-reference.md#configjs](module-reference.md), [config-reference.md](config-reference.md) |
| `runtime/encoding.js` | [module-reference.md#encodingjs](module-reference.md), [rendering-and-styling.md#unicode](rendering-and-styling.md) |
| `runtime/paths.js` | [module-reference.md#pathsjs](module-reference.md) |
| `runtime/statusline-installer.js` | [module-reference.md#statusline-installerjs](module-reference.md), [windows-specifics.md](windows-specifics.md) |
| `runtime/config-wizard.js` | [module-reference.md#config-wizardjs](module-reference.md) |
| `runtime/uninstall.js` | [module-reference.md#uninstalljs](module-reference.md), [install-and-lifecycle.md#uninstall](install-and-lifecycle.md) |
| `scripts/bootstrap.js` | [module-reference.md#bootstrapjs](module-reference.md), [install-and-lifecycle.md](install-and-lifecycle.md) |
| `scripts/diagnose-auth.js` | [module-reference.md#diagnose-authjs](module-reference.md) |
| `scripts/verify-display.js` | [module-reference.md#verify-displayjs](module-reference.md), [testing-and-ci.md](testing-and-ci.md) |
| `scripts/configure-utf8.ps1` | [windows-specifics.md#utf-8-setup](windows-specifics.md) |
| `.github/workflows/e2e.yml` | [testing-and-ci.md#ci-pipeline](testing-and-ci.md) |
| `skills/hud-config/SKILL.md` | [maintainer-guide.md#skills](maintainer-guide.md) |
| `runtime/agy-hud.config.json` | [config-reference.md](config-reference.md) |
