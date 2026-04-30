import { useQuery } from '@tanstack/react-query'
import { getHealth } from '../../api/endpoints'
import ApiErrorAlert from '../ApiErrorAlert'

export default function HealthMiniCard() {
  const q = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    staleTime: 30_000,
  })

  return (
    <div className="dashboard-chart-panel home-health-mini">
      <div className="dashboard-chart-title">System health</div>
      <ApiErrorAlert error={q.error} />
      {q.isLoading && <p className="muted">Checking…</p>}
      {q.data && (
        <div className="home-health-body">
          <p
            className={
              q.data.status === 'ok'
                ? 'alert alert-success'
                : q.data.status === 'degraded'
                  ? 'alert alert-warn'
                  : 'alert alert-error'
            }
            style={{ margin: '0 0 0.5rem', padding: '0.35rem 0.5rem', fontSize: '0.8125rem' }}
          >
            <code className="mono">GET /health</code> — <strong>{q.data.status}</strong>
          </p>
          <table className="data home-dense-table home-health-table">
            <tbody>
              <tr>
                <td>Backend</td>
                <td className="mono">{q.data.backend.status}</td>
                <td className="mono">{q.data.backend.latency_ms.toFixed(1)} ms</td>
              </tr>
              <tr>
                <td>Database</td>
                <td className="mono">{q.data.database.status}</td>
                <td className="mono">{q.data.database.latency_ms.toFixed(1)} ms</td>
              </tr>
              <tr>
                <td>Yahoo</td>
                <td className="mono">{q.data.yfinance.status}</td>
                <td className="mono">{q.data.yfinance.latency_ms.toFixed(1)} ms</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
