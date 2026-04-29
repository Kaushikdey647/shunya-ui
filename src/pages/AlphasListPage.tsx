import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteAlpha, listAlphas } from '../api/endpoints'
import ApiErrorAlert from '../components/ApiErrorAlert'

export default function AlphasListPage() {
  const [limit, setLimit] = useState(100)
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const headerCbRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()

  const q = useQuery({
    queryKey: ['alphas', limit, offset],
    queryFn: () => listAlphas({ limit, offset }),
  })

  useEffect(() => {
    setSelected(new Set())
  }, [limit, offset])

  const rows = q.data ?? []

  const pageIds = useMemo(() => rows.map((a) => a.id), [rows])
  const allOnPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const someOnPageSelected = pageIds.some((id) => selected.has(id))

  useEffect(() => {
    const el = headerCbRef.current
    if (el) {
      el.indeterminate = someOnPageSelected && !allOnPageSelected
    }
  }, [someOnPageSelected, allOnPageSelected])

  const delMut = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await deleteAlpha(id)
      }
    },
    onSuccess: (_, ids) => {
      void qc.invalidateQueries({ queryKey: ['alphas'] })
      void qc.invalidateQueries({ queryKey: ['backtests'] })
      setSelected((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      })
    },
  })

  const toggleAllOnPage = () => {
    if (!rows.length) return
    const ids = rows.map((a) => a.id)
    const allSelected = ids.every((id) => selected.has(id))
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.add(id))
        return next
      })
    }
  }

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const confirmDeleteAlphas = (ids: string[], label: string) => {
    if (
      !window.confirm(
        `Delete ${ids.length} alpha(s): ${label}? This also removes all backtest jobs for each alpha.`,
      )
    ) {
      return
    }
    delMut.mutate(ids)
  }

  return (
    <div className="page-inner stack">
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

      {selected.size > 0 && (
        <div className="row" style={{ alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span className="muted">{selected.size} selected</span>
          <button
            type="button"
            className="btn btn-danger"
            disabled={delMut.isPending}
            onClick={() => {
              const ids = rows.filter((a) => selected.has(a.id)).map((a) => a.id)
              if (ids.length === 0) return
              const label = rows
                .filter((a) => selected.has(a.id))
                .map((a) => a.name)
                .join(', ')
              confirmDeleteAlphas(ids, label)
            }}
          >
            Delete selected
          </button>
        </div>
      )}

      <ApiErrorAlert error={q.error} />
      <ApiErrorAlert error={delMut.error} />
      {q.isLoading && <p className="muted">Loading…</p>}

      {q.data && (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th style={{ width: '2.5rem' }}>
                  <input
                    ref={headerCbRef}
                    type="checkbox"
                    aria-label="Select all on this page"
                    checked={allOnPageSelected}
                    disabled={rows.length === 0 || delMut.isPending}
                    onChange={toggleAllOnPage}
                  />
                </th>
                <th>Name</th>
                <th>ID</th>
                <th>Import ref</th>
                <th>Updated</th>
                <th style={{ width: '6rem' }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(a.id)}
                      disabled={delMut.isPending}
                      aria-label={`Select ${a.name}`}
                      onChange={() => toggleOne(a.id)}
                    />
                  </td>
                  <td>
                    <Link to={`/alphas/${a.id}`}>{a.name}</Link>
                  </td>
                  <td className="mono">{a.id}</td>
                  <td className="mono">{a.import_ref}</td>
                  <td>{new Date(a.updated_at).toLocaleString()}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-danger"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                      disabled={delMut.isPending}
                      onClick={() =>
                        confirmDeleteAlphas([a.id], a.name)
                      }
                    >
                      Delete
                    </button>
                  </td>
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
