import { useQuery } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getMarketMovers } from '../../api/endpoints'
import type { MoversKind } from '../../api/types'
import ApiErrorAlert from '../ApiErrorAlert'

const TABS: { id: MoversKind; label: string }[] = [
  { id: 'gainers', label: 'Top gainers' },
  { id: 'losers', label: 'Top losers' },
  { id: 'active', label: 'Most active' },
]

function fmtVol(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`
  return String(Math.round(v))
}

function pctCell(v: number | null | undefined): ReactElement {
  if (v == null || !Number.isFinite(v)) return <span className="home-metric-muted">—</span>
  const cls = v > 0 ? 'home-pct-pos' : v < 0 ? 'home-pct-neg' : 'home-metric-muted'
  return (
    <span className={cls}>
      {v >= 0 ? '+' : ''}
      {v.toFixed(2)}%
    </span>
  )
}

export default function MoversPanel() {
  const [tab, setTab] = useState<MoversKind>('gainers')
  const q = useQuery({
    queryKey: ['market', 'movers', tab],
    queryFn: () => getMarketMovers({ kind: tab, limit: 25 }),
    staleTime: 90_000,
  })

  return (
    <div className="dashboard-chart-panel home-movers-panel">
      <div className="dashboard-chart-title">Movers</div>
      <div className="home-tab-row" role="tablist" aria-label="Movers screener">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`home-tab${tab === t.id ? ' home-tab-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <ApiErrorAlert error={q.error} />
      {q.isLoading && <p className="muted">Loading movers…</p>}
      {!q.isLoading && q.data && (
        <div className="table-wrap home-movers-scroll">
          <table className="data home-dense-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Price</th>
                <th>%</th>
                <th>Volume</th>
              </tr>
            </thead>
            <tbody>
              {q.data.rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="muted">
                    No rows
                  </td>
                </tr>
              ) : (
                q.data.rows.map((r) => (
                  <tr key={r.ticker}>
                    <td>
                      <Link to={`/instruments/${encodeURIComponent(r.ticker)}`} className="mono">
                        {r.ticker}
                      </Link>
                    </td>
                    <td className="mono">
                      {r.price != null && Number.isFinite(r.price)
                        ? r.price.toLocaleString(undefined, { maximumFractionDigits: 2 })
                        : '—'}
                    </td>
                    <td className="mono">{pctCell(r.pct_change)}</td>
                    <td className="mono">{fmtVol(r.volume)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
