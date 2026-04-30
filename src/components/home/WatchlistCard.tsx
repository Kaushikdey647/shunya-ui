import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { postMarketSnapshot } from '../../api/endpoints'
import {
  addWatchlistSymbol,
  readWatchlist,
  removeWatchlistSymbol,
} from '../../lib/watchlist'
import ApiErrorAlert from '../ApiErrorAlert'

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

export default function WatchlistCard() {
  const qc = useQueryClient()
  const [tickers, setTickers] = useState<string[]>(() => readWatchlist())
  const [input, setInput] = useState('')

  const snap = useQuery({
    queryKey: ['market', 'snapshot', 'watchlist', tickers.join(',')],
    queryFn: () => postMarketSnapshot({ symbols: tickers }),
    enabled: tickers.length > 0,
    staleTime: 90_000,
  })

  const bySym = new Map((snap.data?.rows ?? []).map((r) => [r.symbol, r]))

  const onAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const next = addWatchlistSymbol(input)
    setInput('')
    setTickers(next)
    void qc.invalidateQueries({ queryKey: ['market', 'snapshot', 'watchlist'] })
  }

  return (
    <div className="dashboard-chart-panel home-engine-panel">
      <div className="dashboard-chart-title">Watchlist</div>
      <form className="home-watch-form row" onSubmit={onAdd}>
        <input
          className="home-watch-input"
          placeholder="Ticker"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={32}
          aria-label="Add ticker"
        />
        <button type="submit" className="btn btn-primary">
          Add
        </button>
      </form>
      {tickers.length === 0 ? (
        <p className="muted" style={{ margin: '0.35rem 0 0' }}>
          Add symbols to track daily moves (stored in this browser).
        </p>
      ) : (
        <>
          <ApiErrorAlert error={snap.error} />
          {snap.isLoading && <p className="muted">Loading quotes…</p>}
          {!snap.isLoading && (
            <div className="table-wrap home-engine-scroll">
              <table className="data home-dense-table">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Last</th>
                    <th>Day %</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {tickers.map((sym) => {
                    const row = bySym.get(sym)
                    return (
                      <tr key={sym}>
                        <td>
                          <Link to={`/instruments/${encodeURIComponent(sym)}`} className="mono">
                            {sym}
                          </Link>
                        </td>
                        <td className="mono">
                          {row?.last != null && Number.isFinite(row.last)
                            ? row.last.toLocaleString(undefined, { maximumFractionDigits: 2 })
                            : '—'}
                        </td>
                        <td className="mono">{pctCell(row?.pct_change_1d)}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-danger"
                            style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem' }}
                            onClick={() => {
                              setTickers(removeWatchlistSymbol(sym))
                              void qc.invalidateQueries({
                                queryKey: ['market', 'snapshot', 'watchlist'],
                              })
                            }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
