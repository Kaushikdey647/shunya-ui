/** Normalize API equity / turnover row shapes for Recharts. */

export type EquityChartRow = {
  t: number
  equity: number
  peak: number
  drawdownPct: number
}

export type TurnoverChartRow = {
  t: number
  turnoverUsd: number
  turnoverPct: number | null
}

export type TargetStackRow = Record<string, number | null> & { t: number }

export type HistogramBin = { label: string; count: number; x0: number; x1: number }

export type RollingSharpeRow = { t: number; sharpe: number | null }

export type BacktestTargetRow = { date: string; targets: Record<string, unknown> }

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function rowTimeMs(row: Record<string, unknown>): number | null {
  const raw = row.Date ?? row.date
  if (typeof raw !== 'string') return null
  const ms = Date.parse(raw)
  return Number.isFinite(ms) ? ms : null
}

export function adaptEquityCurve(rows: Record<string, unknown>[]): EquityChartRow[] {
  const out: EquityChartRow[] = []
  for (const row of rows) {
    const t = rowTimeMs(row)
    const equity = num(row.Equity ?? row.equity)
    if (t == null || equity == null) continue
    const peak = num(row.Peak ?? row.peak)
    const dd = num(row.DrawdownPct ?? row.drawdownPct ?? row.drawdown_pct)
    out.push({
      t,
      equity,
      peak: peak ?? equity,
      drawdownPct: dd ?? 0,
    })
  }
  out.sort((a, b) => a.t - b.t)
  return out
}

export function adaptTurnoverHistory(
  turnoverRows: Record<string, unknown>[],
  equityRows: Record<string, unknown>[],
): TurnoverChartRow[] {
  const eq = adaptEquityCurve(equityRows)
  const raw: { t: number; usd: number }[] = []
  for (const row of turnoverRows) {
    const t = rowTimeMs(row)
    const usd = num(row.TurnoverUSD ?? row.turnoverUSD)
    if (t == null || usd == null) continue
    raw.push({ t, usd: usd })
  }
  raw.sort((a, b) => a.t - b.t)

  let eqPtr = 0
  let lastEquity: number | null = null
  const out: TurnoverChartRow[] = []
  for (const to of raw) {
    while (eqPtr < eq.length && eq[eqPtr].t <= to.t) {
      lastEquity = eq[eqPtr].equity
      eqPtr++
    }
    const pct =
      lastEquity != null && lastEquity !== 0 ? (to.usd / lastEquity) * 100 : null
    out.push({ t: to.t, turnoverUsd: to.usd, turnoverPct: pct })
  }
  return out
}

export function formatMetricNumber(v: unknown, digits = 2): string {
  const n = num(v)
  if (n == null) return '—'
  return n.toFixed(digits)
}

/** Approximate periods per year from FinBT metrics (matches server logic). */
export function periodsPerYearFromMetrics(metrics: Record<string, unknown>): number {
  const unit = String(metrics.bar_unit ?? 'DAYS').toUpperCase()
  const step = Math.max(1, Number(metrics.bar_step) || 1)
  switch (unit) {
    case 'SECONDS':
      return (252 * 6.5 * 60 * 60) / step
    case 'MINUTES':
      return (252 * 6.5 * 60) / step
    case 'HOURS':
      return (252 * 6.5) / step
    case 'DAYS':
      return 252 / step
    case 'WEEKS':
      return 52 / step
    case 'MONTHS':
      return 12 / step
    default:
      return 252 / step
  }
}

export function equityBarReturns(equityPts: EquityChartRow[]): number[] {
  const out: number[] = []
  for (let i = 1; i < equityPts.length; i++) {
    const a = equityPts[i - 1]!.equity
    const b = equityPts[i]!.equity
    if (a > 0 && Number.isFinite(b)) out.push(b / a - 1)
  }
  return out
}

export function returnHistogramBins(
  returns: number[],
  binCount = 24,
): HistogramBin[] {
  if (returns.length === 0) return []
  let lo = Math.min(...returns)
  let hi = Math.max(...returns)
  if (lo === hi) {
    const pad = Math.abs(lo) * 0.05 + 1e-8
    lo -= pad
    hi += pad
  }
  const w = (hi - lo) / binCount
  const counts = new Array(binCount).fill(0) as number[]
  for (const r of returns) {
    let i = Math.floor((r - lo) / w)
    if (i < 0) i = 0
    if (i >= binCount) i = binCount - 1
    counts[i]++
  }
  return counts.map((c, i) => ({
    label: `${(lo + i * w).toFixed(4)}–${(lo + (i + 1) * w).toFixed(4)}`,
    count: c,
    x0: lo + i * w,
    x1: lo + (i + 1) * w,
  }))
}

export function rollingSharpeFromEquity(
  equityPts: EquityChartRow[],
  window: number,
  periodsPerYear: number,
): RollingSharpeRow[] {
  const rets = equityBarReturns(equityPts)
  if (rets.length < window + 1) return []
  const out: RollingSharpeRow[] = []
  for (let i = window - 1; i < rets.length; i++) {
    const slice = rets.slice(i - window + 1, i + 1)
    const mean = slice.reduce((s, x) => s + x, 0) / slice.length
    let varSum = 0
    for (const x of slice) varSum += (x - mean) ** 2
    const sd = Math.sqrt(varSum / Math.max(1, slice.length - 1))
    const t = equityPts[i + 1]!.t
    const sharpe =
      sd > 1e-12 && Number.isFinite(mean) ? (Math.sqrt(periodsPerYear) * mean) / sd : null
    out.push({ t, sharpe })
  }
  return out
}

function parseTargetRow(row: unknown): { t: number; w: Map<string, number> } | null {
  if (!row || typeof row !== 'object') return null
  const r = row as Record<string, unknown>
  const rawD = r.date ?? r.Date
  if (typeof rawD !== 'string') return null
  const t = Date.parse(rawD)
  if (!Number.isFinite(t)) return null
  const tg = r.targets
  if (!tg || typeof tg !== 'object') return null
  const w = new Map<string, number>()
  for (const [k, v] of Object.entries(tg as Record<string, unknown>)) {
    const n = num(v)
    if (n != null) w.set(k, n)
  }
  return { t, w }
}

/** Top-K names by mean absolute weight; rest rolled into "Other". */
export function adaptTargetHistoryStacked(
  rows: unknown[],
  topK = 10,
): { keys: string[]; series: TargetStackRow[] } {
  const parsed: { t: number; w: Map<string, number> }[] = []
  for (const row of rows) {
    const p = parseTargetRow(row)
    if (p) parsed.push(p)
  }
  parsed.sort((a, b) => a.t - b.t)
  if (parsed.length === 0) return { keys: [], series: [] }

  const meanAbs = new Map<string, number>()
  for (const { w } of parsed) {
    for (const [sym, v] of w) {
      meanAbs.set(sym, (meanAbs.get(sym) ?? 0) + Math.abs(v))
    }
  }
  for (const s of meanAbs.keys()) {
    meanAbs.set(s, (meanAbs.get(s) ?? 0) / parsed.length)
  }
  const ranked = [...meanAbs.entries()].sort((a, b) => b[1] - a[1])
  const top = ranked.slice(0, topK).map(([s]) => s)
  const topSet = new Set(top)

  const series: TargetStackRow[] = []
  for (const { t, w } of parsed) {
    const row: TargetStackRow = { t }
    let other = 0
    for (const [sym, v] of w) {
      if (topSet.has(sym)) row[sym] = v
      else other += v
    }
    row.Other = other
    series.push(row)
  }

  return { keys: [...top, 'Other'], series }
}

export function targetHistoryConcentration(rows: unknown[]): { t: number; hhi: number; maxAbs: number }[] {
  const out: { t: number; hhi: number; maxAbs: number }[] = []
  for (const row of rows) {
    const p = parseTargetRow(row)
    if (!p) continue
    let hhi = 0
    let maxAbs = 0
    for (const v of p.w.values()) {
      hhi += v * v
      maxAbs = Math.max(maxAbs, Math.abs(v))
    }
    out.push({ t: p.t, hhi, maxAbs })
  }
  out.sort((a, b) => a.t - b.t)
  return out
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return x != null && typeof x === 'object' && !Array.isArray(x)
}

/** Defensive read of backtrader DrawDown analyzer JSON. */
export function summarizeDrawdownAnalysis(dd: unknown): {
  maxLen?: number | null
  maxDrawdownFrac?: number | null
  maxMoneyDown?: number | null
} {
  if (!isRecord(dd)) return {}
  const max = dd.max
  if (!isRecord(max)) return {}
  return {
    maxLen: num(max.len) != null ? Math.round(num(max.len)!) : null,
    maxDrawdownFrac: num(max.drawdown),
    maxMoneyDown: num(max.moneydown),
  }
}

export function summarizeReturnsAnalysis(ret: unknown): {
  rtot?: number | null
  ravg?: number | null
} {
  if (!isRecord(ret)) return {}
  return {
    rtot: num(ret.rtot),
    ravg: num(ret.ravg),
  }
}

export function summarizeSharpeAnalysis(sh: unknown): { sharperatio?: number | null } {
  if (!isRecord(sh)) return {}
  return { sharperatio: num(sh.sharperatio) }
}
