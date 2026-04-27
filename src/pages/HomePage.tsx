import { useQuery } from '@tanstack/react-query'
import { getHealth } from '../api/endpoints'
import ApiErrorAlert from '../components/ApiErrorAlert'

export default function HomePage() {
  const q = useQuery({ queryKey: ['health'], queryFn: getHealth })

  return (
    <div className="page-inner stack">
      <h1>Shunya backtest</h1>
      <p className="muted">
        API is proxied from this dev server as <code className="mono">/api</code> →{' '}
        <code className="mono">http://127.0.0.1:8000</code>. Start the FastAPI process first (
        <code className="mono">uv run python -m backtest_api</code>).
      </p>

      <section>
        <h2>API health</h2>
        {q.isLoading && <p className="muted">Checking…</p>}
        <ApiErrorAlert error={q.error} />
        {q.data && (
          <div className="stack">
            <p
              className={
                q.data.status === 'ok'
                  ? 'alert alert-success'
                  : q.data.status === 'degraded'
                    ? 'alert alert-warn'
                    : 'alert alert-error'
              }
            >
              <code className="mono">GET /health</code> → <strong>{q.data.status}</strong>
            </p>
            <table className="health-table">
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Status</th>
                  <th>Latency (ms)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Backend</td>
                  <td>{q.data.backend.status}</td>
                  <td className="mono">{q.data.backend.latency_ms}</td>
                </tr>
                <tr>
                  <td>Database</td>
                  <td>{q.data.database.status}</td>
                  <td className="mono">{q.data.database.latency_ms}</td>
                </tr>
                <tr>
                  <td>Yahoo Finance</td>
                  <td>{q.data.yfinance.status}</td>
                  <td className="mono">{q.data.yfinance.latency_ms}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
