import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { listBacktests } from '../../api/endpoints'
import type { BacktestJobOut } from '../../api/types'
import ApiErrorAlert from '../ApiErrorAlert'

function primaryMetric(summary: Record<string, unknown> | null): string {
  if (!summary) return '—'
  const cagr = summary.cagr_pct
  if (typeof cagr === 'number' && Number.isFinite(cagr)) return `${cagr.toFixed(2)}% CAGR`
  const sh = summary.sharpe_ratio
  if (typeof sh === 'number' && Number.isFinite(sh)) return `Sharpe ${sh.toFixed(2)}`
  return '—'
}

function statusClass(status: BacktestJobOut['status']): string {
  if (status === 'succeeded') return 'home-status-ok'
  if (status === 'failed') return 'home-status-err'
  return 'home-status-pending'
}

export default function RecentBacktestsFeed() {
  const navigate = useNavigate()
  const q = useQuery({
    queryKey: ['backtests', 'home-recent'],
    queryFn: () => listBacktests({ limit: 10, offset: 0 }),
    staleTime: 30_000,
  })

  return (
    <div className="dashboard-chart-panel home-engine-panel">
      <div className="dashboard-chart-title">Recent backtests</div>
      <ApiErrorAlert error={q.error} />
      {q.isLoading && <p className="muted">Loading…</p>}
      {!q.isLoading && q.data && (
        <div className="table-wrap home-engine-scroll">
          <table className="data home-dense-table">
            <thead>
              <tr>
                <th>Alpha</th>
                <th>Status</th>
                <th>Metric</th>
              </tr>
            </thead>
            <tbody>
              {q.data.length === 0 ? (
                <tr>
                  <td colSpan={3} className="muted">
                    No runs yet
                  </td>
                </tr>
              ) : (
                q.data.map((job) => (
                  <tr
                    key={job.id}
                    className="home-click-row"
                    onClick={() => navigate(`/backtests/${encodeURIComponent(job.id)}`)}
                  >
                    <td>{job.alpha_name?.trim() || job.alpha_id}</td>
                    <td>
                      <span className={`mono ${statusClass(job.status)}`}>{job.status}</span>
                    </td>
                    <td className="mono">{primaryMetric(job.result_summary)}</td>
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
