// dsh-deepseek-balance — browser half.
// 注册到 sidebar.footer.action（侧边栏底部、设置入口上方）：宽栏显示 "$ + 余额"，
// 窄栏只显示 "$"；点击展开详情面板（余额 / 可用 / 当前对话费用 / 赠送）。
window.__ModuleLoader__.load({
  id: 'dsh-deepseek-balance',
  factory: (require) => {
    const { useState, useEffect, useCallback } = require('react')
    const { jsx, jsxs, Fragment } = require('react/jsx-runtime')

    const T = {
      // 色板走主题 token，深浅色自动跟随
      main: 'var(--dsw-alias-label-primary)',
      sub: 'var(--dsw-alias-label-secondary)',
      faint: 'var(--dsw-alias-label-tertiary)',
      ok: 'var(--dsw-alias-state-success-primary)',
      bad: 'var(--dsw-alias-state-error-primary)',
      border: 'var(--dsw-alias-border-l2)',
      panelBg: 'var(--dsw-alias-bg-overlay)',
      hoverBg: 'var(--dsw-alias-interactive-bg-hover)',
    }

    const S = {
      wrap: { position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' },
      row: {
        display: 'flex', alignItems: 'center', gap: 8, height: 42,
        width: 'calc(100% + 4px)', margin: '4px -2px', padding: '0 10px 0 8px', boxSizing: 'border-box',
        border: 'none', borderRadius: 12, background: 'transparent',
        fontFamily: 'inherit', fontSize: 14, lineHeight: '22px', color: T.main, cursor: 'pointer',
      },
      rowRail: { width: 36, height: 36, padding: 0, justifyContent: 'center', borderRadius: '50%', margin: '8px 0 10px' },
      dollar: { width: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 20, lineHeight: '22px', color: T.sub },
      label: { overflow: 'hidden', whiteSpace: 'nowrap' },
      amount: { marginLeft: 'auto', color: T.sub, fontWeight: 500, fontVariantNumeric: 'tabular-nums', fontSize: 13 },
      panel: {
        position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, zIndex: 40,
        width: 224, padding: '8px 10px', boxSizing: 'border-box',
        borderRadius: 12, border: `1px solid ${T.border}`, background: T.panelBg,
        boxShadow: '0 8px 24px rgba(0,0,0,.18)', display: 'flex', flexDirection: 'column', gap: 4,
      },
      head: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: T.main },
      refresh: { marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, border: 'none', borderRadius: 6, background: 'transparent', color: T.sub, cursor: 'pointer', fontSize: 14, lineHeight: '14px' },
      big: { fontSize: 20, lineHeight: '26px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: T.main },
      chip: (ok) => ({
        marginLeft: 6, padding: '0 6px', borderRadius: 999,
        fontSize: 10, lineHeight: '16px', color: ok ? T.ok : T.bad, background: T.hoverBg,
      }),
      line: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.sub, fontVariantNumeric: 'tabular-nums' },
      faint: { fontSize: 10, color: T.faint, fontVariantNumeric: 'tabular-nums' },
      err: { fontSize: 11, color: T.bad, wordBreak: 'break-all' },
    }

    function symbol(code) {
      return code === 'USD' ? '$' : code === 'CNY' ? '¥' : `${code} `
    }

    function money(v, code) {
      return `${symbol(code)}${v ?? '—'}`
    }

    function formatTokens(n) {
      const v = Math.round(n)
      if (v >= 1e6) return `${(v / 1e6).toFixed(2).replace(/\.?0+$/, '')}M`
      if (v >= 1e3) return `${(v / 1e3).toFixed(1).replace(/\.0$/, '')}K`
      return String(v)
    }

    async function fetchQuota() {
      const res = await fetch('/api/quota', { cache: 'no-store' })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`)
      return body
    }

    function BalanceBadge(props) {
      const wide = props.wide === true
      const useSessions = props.useSessions
      const [quota, setQuota] = useState(null)
      const [err, setErr] = useState(null)
      const [cost, setCost] = useState(null)
      const [open, setOpen] = useState(false)
      const sessionId = typeof useSessions === 'function' ? useSessions((s) => s.current) : undefined

      const refresh = useCallback(() => {
        fetchQuota()
          .then((q) => { setQuota(q); setErr(null) })
          .catch((e) => setErr(e.message))
      }, [])

      useEffect(() => {
        refresh()
        const timer = setInterval(refresh, 60000)
        return () => clearInterval(timer)
      }, [refresh])

      useEffect(() => {
        if (sessionId === undefined) { setCost(null); return }
        let alive = true
        const load = async () => {
          try {
            const res = await fetch(`/api/quota/session?sessionId=${encodeURIComponent(sessionId)}`, { cache: 'no-store' })
            if (alive && res.ok) setCost(await res.json())
          } catch {}
        }
        load()
        const timer = setInterval(load, 5000)
        return () => { alive = false; clearInterval(timer) }
      }, [sessionId])

      const currency = quota?.currency ?? 'CNY'
      const available = quota?.available !== false
      const tok = cost ? cost.input + cost.cache + cost.output : 0

      const row = jsxs('button', {
        type: 'button',
        title: err ?? 'DeepSeek 余额',
        'aria-label': 'DeepSeek 余额',
        'aria-expanded': open,
        onClick: () => setOpen(!open),
        onMouseEnter: (e) => { e.currentTarget.style.background = T.hoverBg },
        onMouseLeave: (e) => { e.currentTarget.style.background = 'transparent' },
        style: wide ? S.row : { ...S.row, ...S.rowRail },
        children: [
          jsx('span', { style: S.dollar, children: '$' }),
          wide && jsx('span', { style: S.label, children: '余额' }),
          wide && jsx('span', { style: S.amount, children: quota ? money(quota.total, currency) : err ? '—' : '…' }),
        ],
      })

      const panel = open && jsx('div', {
        style: wide ? { ...S.panel, width: 'auto', right: 0 } : S.panel,
        children: jsxs(Fragment, {
          children: [
            jsxs('div', { style: S.head, children: [
              jsx('span', { children: 'DeepSeek 余额' }),
              jsx('button', { type: 'button', title: '刷新', 'aria-label': '刷新余额', onClick: refresh, style: S.refresh, children: '↻' }),
            ] }),
            err
              ? jsx('div', { style: S.err, children: err })
              : jsxs('div', {
                style: S.big,
                children: [money(quota?.total, currency), jsx('span', { style: S.chip(available), children: available ? '可用' : '不可用' })],
              }),
            quota && jsx('div', { style: S.line, children: [jsx('span', { children: '赠送' }), jsx('span', { children: money(quota.granted, currency) })] }),
            cost && jsx('div', { style: S.line, children: [jsx('span', { children: '当前对话' }), jsx('span', { children: `${money(cost.cost.toFixed(4), 'CNY')} · ${formatTokens(tok)} Tokens` })] }),
            jsx('div', { style: S.faint, children: '点击行可收起 · 每 60s 自动刷新' }),
          ],
        }),
      })

      return jsxs('div', { style: S.wrap, children: [row, panel] })
    }

    const inject = ['slots']
    function apply(ctx) {
      ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
        name: 'sidebar.footer.action',
        id: 'deepseek-balance',
      }, BalanceBadge))
    }
    return { apply, inject }
  },
})
