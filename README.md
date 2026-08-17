# dsh-deepseek-balance

DeepSeek Harness（`dsh`）Web GUI 插件：在**侧边栏底部（设置入口上方）**显示 DeepSeek API 余额，点击展开详情（余额 / 可用状态 / 当前对话费用 / 赠送余额）。

- 余额来自官方公开接口 `GET /user/balance`（只需 API key，浏览器不接触明文）。
- 当前对话费用：Host 侧订阅 `session/event`，按官方价格表对每条 `assistant/message` 实时计价（含峰谷）。
- 无构建步骤，纯 JS；`dsh.client` 浏览器 bundle 与 Host 半随包发布。

## 安装

```sh
dsh plugin --profile web add dsh-deepseek-balance
dsh web   # 重启后刷新页面
```

## 价格表

`src/pricing.js` 维护当前价格（¥/1M tokens，含 9-12、14-18 高峰价）。官方调价时更新 `RATES` 即可。

## 已知限制

- 会话费用为**实时累计**，`dsh` 重启后清零（不含历史会话）。
- 计价仅 CNY；USD 账户的余额按 `currency` 显示符号，费用仍按 CNY 单价计。
