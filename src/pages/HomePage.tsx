import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getHealth } from '../api/endpoints'
import ApiErrorAlert from '../components/ApiErrorAlert'

export default function HomePage() {
  const q = useQuery({ queryKey: ['health'], queryFn: getHealth })

  return (
    <div className="stack">
      <h1>Shunya backtest UI</h1>
      <p className="muted">
        Local API via Vite proxy (<code>/api</code> →{' '}
        <code>http://127.0.0.1:8000</code>). Start the FastAPI server first.
      </p>

      <section>
        <h2>API health</h2>
        {q.isLoading && <p className="muted">Checking…</p>}
        <ApiErrorAlert error={q.error} />
        {q.data && (
          <p className="alert alert-success">
            <code className="mono">GET /health</code> →{' '}
            <strong>{q.data.status}</strong>
          </p>
        )}
      </section>

      <section>
        <h2>Sections</h2>
        <ul>
          <li>
            <Link to="/alphas">Alphas</Link>
          </li>
          <li>
            <Link to="/backtests">Backtests</Link>
          </li>
          <li>
            <Link to="/data">Data summary</Link>
          </li>
        </ul>
      </section>
    </div>
  )
}
