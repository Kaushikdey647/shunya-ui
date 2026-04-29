import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  deleteBacktest,
  deleteBacktestsBatch,
  listAlphas,
  listBacktests,
} from '../api/endpoints'
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
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const headerCbRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()

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

  useEffect(() => {
    setSelected(new Set())
  }, [limit, offset, alphaFilterParam, statusFilter])

  const rows = q.data ?? []

  const pageIds = useMemo(() => rows.map((j) => j.id), [rows])
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
      if (ids.length === 1) {
        await deleteBacktest(ids[0])
        return { deleted: 1 }
      }
      return deleteBacktestsBatch(ids)
    },
    onSuccess: (_, ids) => {
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
    const ids = rows.map((j) => j.id)
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

  const confirmDeleteJobs = (ids: string[]) => {
    if (
      !window.confirm(
        `Delete ${ids.length} backtest job(s)? This cannot be undone.`,
      )
    ) {
      return
    }
    delMut.mutate(ids)
  }

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

      {selected.size > 0 && (
        <div className="row" style={{ alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span className="muted">{selected.size} selected</span>
          <button
            type="button"
            className="btn btn-danger"
            disabled={delMut.isPending}
            onClick={() => {
              const ids = rows.filter((j) => selected.has(j.id)).map((j) => j.id)
              if (ids.length === 0) return
              confirmDeleteJobs(ids)
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
                <th>Status</th>
                <th>Job ID</th>
                <th>Alpha</th>
                <th>Index</th>
                <th>Created</th>
                <th style={{ width: '6rem' }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((j) => (
                <tr key={j.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(j.id)}
                      disabled={delMut.isPending}
                      aria-label={`Select job ${j.id}`}
                      onChange={() => toggleOne(j.id)}
                    />
                  </td>
                  <td>{j.status}</td>
                  <td>
                    <Link to={`/backtests/${j.id}`} className="mono">
                      {j.id}
                    </Link>
                  </td>
                  <td>{j.alpha_name ?? <span className="muted mono">{j.alpha_id}</span>}</td>
                  <td className="mono">{j.index_code ?? '—'}</td>
                  <td>{new Date(j.created_at).toLocaleString()}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-danger"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                      disabled={delMut.isPending}
                      onClick={() => confirmDeleteJobs([j.id])}
                    >
                      Delete
                    </button>
                  </td>
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
