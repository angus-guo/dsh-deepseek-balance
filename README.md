# dsh-deepseek-balance

> DeepSeek Harness（`dsh`）Web GUI 插件：在**侧边栏底部（设置入口上方）**显示 DeepSeek API 余额，点击展开详情。

基于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的插件架构（一切皆插件）编写，纯 JavaScript、零构建步骤。

## 截图

> 占位：请将 Web UI 的实际截图保存为 `docs/screenshot.png`，然后取消下面这行图片的注释。

<!-- ![screenshot](docs/screenshot.png) -->

## 功能

- **左下角入口**：`$` 图标 + “余额”标签，风格与“设置”入口对齐（间距、高度、圆角一致）
- **点击展开详情**：总余额、可用状态、赠送余额、当前对话费用
- **当前对话费用**：Host 侧按官方价格表对每条消息实时计价，并回放持久化日志（重启后历史费用不丢失）
- **手动 + 自动刷新**：详情面板内置 ↻ 刷新按钮；余额每 60s、对话费用每 5s 自动刷新
- **响应式**：详情面板宽度跟随侧边栏拉伸；窄栏（56px rail）下只显示 `$` 图标
- **明暗主题**：全部使用 `--dsw-*` 设计 token，自动跟随浅色/深色模式
- **安全**：API key 只在 Host 侧解析，浏览器拿不到明文

## 安装

### 方式一：从 npm（发布后）

```sh
dsh plugin --profile web add dsh-deepseek-balance
```

### 方式二：本地安装

```sh
git clone https://github.com/angus-guo/dsh-deepseek-balance.git
cd dsh-deepseek-balance
dsh plugin --profile web add .
```

安装后重启并刷新页面：

```sh
dsh web
```

> 浏览器侧 bundle 在 `dsh web` 重启时重新生成，请**硬刷新**页面（`Cmd + Shift + R`）。

### 前置条件

- 已在 **设置 → 模型** 中配置 DeepSeek API Key（存储在 `~/.dsh/.credentials.yaml`，或通过环境变量 `DEEPSEEK_API_KEY` 提供）。

## 使用

- 侧边栏底部会多出一行 **`$ 余额`**（位于“设置”上方），右侧显示当前总余额。
- **点击**该行展开详情面板，再次点击收起。
- 详情面板字段：

| 字段 | 含义 | 来源 |
|---|---|---|
| 余额（大字） | 总余额 | `/user/balance` |
| 可用 / 不可用 | 账户是否可调用 API | `/user/balance` 的 `is_available` |
| 赠送 | 赠送（赠金）余额 | `/user/balance` 的 `granted_balance` |
| 当前对话 | 当前会话累计费用 + token 数 | 本地按价格表计价 |

## 数据来源

- **余额**：DeepSeek 公开接口 [`GET /user/balance`](https://api-docs.deepseek.com/api/get-user-balance/)。
- **当前对话费用**：订阅 `session/event`，对每条 `assistant/message` 按 `TokenUsage × 单价 / 1M` 计价，并回放持久化日志补齐重启前的历史。

## 价格表

价格数据维护在 [`src/pricing.js`](src/pricing.js)，整理自 [DeepSeek 官方定价页](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/)。含峰谷定价（北京时间 9:00–12:00、14:00–18:00 为高峰）。官方调价时更新 `RATES` 即可。

## 目录结构

```
src/
├── index.js      # Host 半：/api/quota（余额）+ /api/quota/session（会话费用）
├── pricing.js    # 价格表 + 峰谷判定 + 计价
└── client.js     # 浏览器半：侧边栏底部入口 + 详情面板
cordis.patch.yml  # bundle patch 层
```

## 已知限制

- 计价仅按 CNY 单价；USD 账户的余额按 `currency` 显示符号，费用仍按 CNY 计。
- 价格表只维护当前价格（不含历史调价），用于“当前对话费用”的近似计算。
- 会话费用只统计**本机 dsh 会话**的消费，不含 platform 网页或其他工具的消费。

## License

[MIT](LICENSE)
