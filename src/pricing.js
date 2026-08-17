/**
 * DeepSeek 当前价格表（¥ / 1M tokens）。
 * 数值整理自官方定价页：https://api-docs.deepseek.com/zh-cn/quick_start/pricing/
 * 字段：in = 输入（缓存未命中），cache = 缓存命中，out = 输出。
 * 高峰时段（北京时间 9-12、14-18）部分模型另有 peak 价，其余用 off 价。
 */
const RATES = {
  'deepseek-chat': { off: { in: 2, cache: 0.5, out: 8 } },
  'deepseek-reasoner': { off: { in: 4, cache: 1, out: 16 } },
  'deepseek-v4-flash': {
    off: { in: 1.5, cache: 0.05, out: 4.5 },
    peak: { in: 3, cache: 0.1, out: 9 },
  },
  'deepseek-v4-pro': {
    off: { in: 4.5, cache: 0.15, out: 13.5 },
    peak: { in: 9, cache: 0.3, out: 27 },
  },
}

const FALLBACK = RATES['deepseek-chat']
const PEAK_WINDOWS = [[9, 12], [14, 18]]

/** 北京时间当前小时（0-23），用于峰谷判定。 */
function beijingHour(timeMs) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(timeMs)
  return Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24
}

/** 模型在某一时刻的单价；未收录的模型按 deepseek-chat 兜底。 */
export function unitPrice(model, timeMs) {
  const rate = RATES[model] ?? FALLBACK
  const peak = PEAK_WINDOWS.some(([start, end]) => {
    const h = beijingHour(timeMs)
    return h >= start && h < end
  })
  return (peak && rate.peak) || rate.off
}

/** 按一条 assistant/message 的 TokenUsage 计价（¥）。 */
export function costOf(usage, model, timeMs) {
  const p = unitPrice(model, timeMs)
  const input = usage.inputTokens ?? 0
  const cache = usage.cacheReadTokens ?? 0
  const output = usage.outputTokens ?? 0
  return (input * p.in + cache * p.cache + output * p.out) / 1e6
}
