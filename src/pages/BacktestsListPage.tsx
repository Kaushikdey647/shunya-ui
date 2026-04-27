import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { listBacktests } from '../api/endpoints'
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
  const [alphaId, setAlphaId] = useState('')
  const [statusFilter, setStatusFilter] = useState<BacktestJobStatus | ''>('')

  const q = useQuery({
    queryKey: ['backtests', limit, offset, alphaId, statusFilter],
    queryFn: () =>
      listBacktests({
        limit,
        offset,
        alpha_id: alphaId.trim() || null,
        status: statusFilter || null,
      }),
  })

  return (
    <div className="page-inner stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Backtests</h1>
        <Link to="/backtests/new" className="btn btn-primary">
          New backtest
        </Link>
      </div>

      <div className="row">
        <label>
          Alpha id (optional)
          <input
            type="text"
            value={alphaId}
            onChange={(e) => {
              setAlphaId(e.target.value)
              setOffset(0)
            }}
            className="mono"
            style={{ minWidth: '14rem' }}
          />
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
                  <td className="mono">{j.alpha_id}</td>
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
