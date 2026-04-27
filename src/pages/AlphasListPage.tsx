import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { listAlphas } from '../api/endpoints'
import ApiErrorAlert from '../components/ApiErrorAlert'

export default function AlphasListPage() {
  const [limit, setLimit] = useState(100)
  const [offset, setOffset] = useState(0)

  const q = useQuery({
    queryKey: ['alphas', limit, offset],
    queryFn: () => listAlphas({ limit, offset }),
  })

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Alphas</h1>
        <Link to="/alphas/new" className="btn btn-primary">
          New alpha
        </Link>
      </div>

      <div className="row">
        <label>
          Limit{' '}
          <input
            type="number"
            min={1}
            max={500}
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value) || 100)
              setOffset(0)
            }}
            style={{ width: '5rem' }}
          />
        </label>
        <label>
          Offset{' '}
          <input
            type="number"
            min={0}
            value={offset}
            onChange={(e) => setOffset(Number(e.target.value) || 0)}
            style={{ width: '5rem' }}
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
                <th>Name</th>
                <th>ID</th>
                <th>Import ref</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link to={`/alphas/${a.id}`}>{a.name}</Link>
                  </td>
                  <td className="mono">{a.id}</td>
                  <td className="mono">{a.import_ref}</td>
                  <td>{new Date(a.updated_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {q.data.length === 0 && <p className="muted">No alphas.</p>}
        </div>
      )}
    </div>
  )
}
