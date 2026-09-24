/**
 * dsh-deepseek-balance-cn — host half.
 *
 * 两个本地 HTTP 路由：
 *   GET /api/quota                    → 余额（公开接口 /user/balance）
 *   GET /api/quota/session?sessionId → 当前会话费用（回放持久化日志，含历史）
 *
 * API key 走 dsh 的 credentials seam（引用名 DEEPSEEK_API_KEY），浏览器拿不到明文。
 */
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { costOf } from './pricing.js'

export const name = 'dsh-deepseek-balance-cn'
export const inject = ['webServer', 'credentials']

const BALANCE_PATH = '/api/quota'
const SESSION_PATH = '/api/quota/session'

/** 实时累计（覆盖尚未落盘的进行中消息）：sessionId -> { cost, input, cache, output } */
const ledger = new Map()

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

/** 把一条 assistant/message 事件按当刻价格表累计进 rec。 */
function accumulate(rec, event) {
  const usage = event.data?.usage
  if (usage == null) return
  const model = event.data?.message?.source?.model ?? 'deepseek-chat'
  rec.cost += costOf(usage, model, event.time ?? Date.now())
  rec.input += usage.inputTokens ?? 0
  rec.cache += usage.cacheReadTokens ?? 0
  rec.output += usage.outputTokens ?? 0
}

/**
 * 会话费用：优先回放持久化日志（覆盖重启前的历史），失败则回退实时 ledger。
 * @returns { cost, input, cache, output }
 */
async function sessionCost(ctx, sessionId) {
  const persistence = ctx.get('sessionPersistence')
  if (persistence != null && typeof persistence.readRaw === 'function') {
    try {
      const raw = await persistence.readRaw(sessionId)
      if (raw != null && typeof raw.content === 'string') {
        const rec = { cost: 0, input: 0, cache: 0, output: 0 }
        for (const line of raw.content.split('\n')) {
          if (line === '') continue
          let event
          try { event = JSON.parse(line) } catch { continue }
          if (event?.type === 'assistant/message') accumulate(rec, event)
        }
        return rec
      }
    } catch (error) {
      ctx.logger?.warn('dsh-deepseek-balance-cn: log replay failed', error)
    }
  }
  return ledger.get(sessionId) ?? { cost: 0, input: 0, cache: 0, output: 0 }
}

export function apply(ctx) {
  // 实时累计（进行中消息）
  ctx.on('session/event', (session, event) => {
    if (event?.type !== 'assistant/message') return
    const rec = ledger.get(session.id) ?? { cost: 0, input: 0, cache: 0, output: 0 }
    accumulate(rec, event)
    ledger.set(session.id, rec)
  })

  // 余额
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: BALANCE_PATH,
    handler: async (_req, res) => {
      const key = await ctx.credentials.resolve(credentialRef('DEEPSEEK_API_KEY'))
      if (key == null) return send(res, 503, { error: '未配置 DeepSeek API Key' })
      try {
        const upstream = await fetch('https://api.deepseek.com/user/balance', {
          headers: { authorization: `Bearer ${key.value}` },
          signal: AbortSignal.timeout(10000),
        })
        const body = await upstream.json().catch(() => null)
        if (!upstream.ok) return send(res, upstream.status, { error: body?.error?.message ?? `HTTP ${upstream.status}` })
        const info = body?.balance_infos?.[0] ?? {}
        send(res, 200, {
          total: info.total_balance,
          granted: info.granted_balance,
          currency: info.currency ?? 'CNY',
          available: body?.is_available !== false,
        })
      } catch (error) {
        send(res, 502, { error: error instanceof Error ? error.message : String(error) })
      }
    },
  }))

  // 当前会话费用（回放历史 + 实时兜底）
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: SESSION_PATH,
    handler: async (req, res) => {
      const sessionId = new URL(req.url ?? '/', 'http://x').searchParams.get('sessionId')
      const rec = sessionId != null ? await sessionCost(ctx, sessionId) : { cost: 0, input: 0, cache: 0, output: 0 }
      send(res, 200, rec)
    },
  }))
}
