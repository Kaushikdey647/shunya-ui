import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listAlphas, listBacktests } from '../api/endpoints'
import type { BacktestJobStatus } from '../api/types'
import ApiErrorAlert from '../components/ApiErrorAlert'

const STATUS_OPTIONS: (BacktestJobStatus | '')[] = [
  '',
  'queued',
  'running',
  'succeeded',
  'failed',
]

export default function BacktestsListPage() {
  const [limit, setLimit] = useState(50)
  const [offset, setOffset] = useState(0)
  const [alphaIdFilter, setAlphaIdFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<BacktestJobStatus | ''>('')

  const alphasQ = useQuery({
    queryKey: ['alphas', 'for-filter'],
    queryFn: () => listAlphas({ limit: 500, offset: 0 }),
  })

  const alphaFilterParam = useMemo(() => {
    return alphaIdFilter.trim() || null
  }, [alphaIdFilter])

  const q = useQuery({
    queryKey: ['backtests', limit, offset, alphaFilterParam, statusFilter],
    queryFn: () =>
      listBacktests({
        limit,
        offset,
        alpha_id: alphaFilterParam,
        status: statusFilter || null,
      }),
  })

  return (
    <div className="page-inner stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Backtests</h1>
        <Link to="/backtests/new" className="btn btn-primary">
          New backtest
        </Link>
      </div>

      <div className="row" style={{ flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
        <label>
          Alpha
          <select
            value={alphaIdFilter}
            onChange={(e) => {
              setAlphaIdFilter(e.target.value)
              setOffset(0)
            }}
            style={{ minWidth: '14rem' }}
            disabled={alphasQ.isLoading}
          >
            <option value="">All alphas</option>
            {(alphasQ.data ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as BacktestJobStatus | '')
              setOffset(0)
            }}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s || 'all'} value={s}>
                {s === '' ? 'All' : s}
              </option>
            ))}
          </select>
        </label>
        <label>
          Limit
          <input
            type="number"
            min={1}
            max={200}
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value) || 50)
              setOffset(0)
            }}
            style={{ width: '4rem' }}
          />
        </label>
        <label>
          Offset
          <input
            type="number"
            min={0}
            value={offset}
            onChange={(e) => setOffset(Number(e.target.value) || 0)}
            style={{ width: '4rem' }}
          />
        </label>
        <button
          type="button"
          className="btn"
          disabled={offset === 0}
          onClick={() => setOffset((o) => Math.max(0, o - limit))}
        >
          Previous page
        </button>
        <button
          type="button"
          className="btn"
          disabled={!q.data || q.data.length < limit}
          onClick={() => setOffset((o) => o + limit)}
        >
          Next page
        </button>
      </div>

      <ApiErrorAlert error={q.error} />
      {q.isLoading && <p className="muted">Loading…</p>}

      {q.data && (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Status</th>
                <th>Job ID</th>
                <th>Alpha</th>
                <th>Index</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((j) => (
                <tr key={j.id}>
                  <td>{j.status}</td>
                  <td>
                    <Link to={`/backtests/${j.id}`} className="mono">
                      {j.id}
                    </Link>
                  </td>
                  <td>{j.alpha_name ?? <span className="muted mono">{j.alpha_id}</span>}</td>
                  <td className="mono">{j.index_code ?? '—'}</td>
                  <td>{new Date(j.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {q.data.length === 0 && <p className="muted">No jobs.</p>}
        </div>
      )}
    </div>
  )
}
