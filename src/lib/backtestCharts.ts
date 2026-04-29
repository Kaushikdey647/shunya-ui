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
