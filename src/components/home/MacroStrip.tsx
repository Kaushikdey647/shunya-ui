import { useQuery } from '@tanstack/react-query'
import { Line, LineChart, ResponsiveContainer } from 'recharts'
import { postMarketSnapshot } from '../../api/endpoints'
import type { MarketSnapshotRow } from '../../api/types'
import ApiErrorAlert from '../ApiErrorAlert'
import { MACRO_STRIP_SYMBOLS } from '../../lib/macroSymbols'

function pctClass(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return 'home-metric-muted'
  if (v > 0) return 'home-pct-pos'
  if (v < 0) return 'home-pct-neg'
  return 'home-metric-muted'
}

function MacroCard({ row }: { row: MarketSnapshotRow }) {
  const data = row.sparkline_close.map((close, i) => ({ i, close }))
  const pct = row.pct_change_1d
  const last = row.last

  return (
    <div className="home-macro-card">
      <div className="home-macro-card-head">
        <span className="mono home-macro-symbol">{row.symbol}</span>
        <span className={`mono home-macro-pct ${pctClass(pct)}`}>
          {pct != null && Number.isFinite(pct) ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%` : '—'}
        </span>
      </div>
      <div className="mono home-macro-price">
        {last != null && Number.isFinite(last) ? last.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
      </div>
      <div className="home-macro-spark">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={52}>
            <LineChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <Line
                type="monotone"
                dataKey="close"
                stroke="var(--text-muted)"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="muted" style={{ height: 52, fontSize: '0.75rem', paddingTop: '1rem' }}>
            No series
          </div>
        )}
      </div>
    </div>
  )
}

export default function MacroStrip() {
  const symbols = [...MACRO_STRIP_SYMBOLS]
  const q = useQuery({
    queryKey: ['market', 'snapshot', 'macro', symbols.join(',')],
    queryFn: () => postMarketSnapshot({ symbols }),
    staleTime: 90_000,
  })

  const bySym = new Map((q.data?.rows ?? []).map((r) => [r.symbol, r]))

  return (
    <section className="home-macro-row" aria-label="Macro overview">
      <ApiErrorAlert error={q.error} />
      {q.isLoading && <p className="muted">Loading macro…</p>}
      {!q.isLoading &&
        symbols.map((sym) => {
          const row =
            bySym.get(sym) ??
            ({
              symbol: sym,
              last: null,
              pct_change_1d: null,
              volume: null,
              sparkline_close: [],
            } satisfies MarketSnapshotRow)
          return <MacroCard key={sym} row={row} />
        })}
    </section>
  )
}
