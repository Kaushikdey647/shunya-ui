import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listAlphas, listBacktests, searchInstruments } from '../api/endpoints'
import type { AlphaOut, BacktestJobOut } from '../api/types'

function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), ms)
    return () => window.clearTimeout(t)
  }, [value, ms])
  return debounced
}

function alphaMatches(a: AlphaOut, needle: string): boolean {
  if (!needle) return true
  const n = needle.toLowerCase()
  return (
    a.name.toLowerCase().includes(n) ||
    (a.description?.toLowerCase().includes(n) ?? false)
  )
}

function jobMatches(j: BacktestJobOut, needle: string): boolean {
  if (!needle) return true
  const n = needle.toLowerCase()
  return (
    j.id.toLowerCase().includes(n) ||
    (j.alpha_name?.toLowerCase().includes(n) ?? false) ||
    j.alpha_id.toLowerCase().includes(n) ||
    (j.index_code?.toLowerCase().includes(n) ?? false)
  )
}

type Props = {
  open: boolean
  onClose: () => void
}

export default function CommandPalette({ open, onClose }: Props) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [q, setQ] = useState('')
  const debounced = useDebouncedValue(q.trim(), 280)

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset query when overlay opens
      setQ('')
      window.setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const alphasQ = useQuery({
    queryKey: ['alphas', 'command-palette'],
    queryFn: () => listAlphas({ limit: 500, offset: 0 }),
    enabled: open,
    staleTime: 60_000,
  })

  const backtestsQ = useQuery({
    queryKey: ['backtests', 'command-palette'],
    queryFn: () => listBacktests({ limit: 50, offset: 0 }),
    enabled: open,
    staleTime: 20_000,
  })

  const searchQ = useQuery({
    queryKey: ['instrument-search-palette', debounced],
    queryFn: () => searchInstruments(debounced),
    enabled: open && debounced.length >= 1,
    staleTime: 30_000,
  })

  const needle = q.trim()

  const alphaHits = useMemo(() => {
    const rows = alphasQ.data ?? []
    return rows.filter((a) => alphaMatches(a, needle)).slice(0, 14)
  }, [alphasQ.data, needle])

  const jobHits = useMemo(() => {
    const rows = backtestsQ.data ?? []
    return rows.filter((j) => jobMatches(j, needle)).slice(0, 10)
  }, [backtestsQ.data, needle])

  const quoteHits = searchQ.data?.quotes?.slice(0, 8) ?? []

  const go = (path: string) => {
    onClose()
    navigate(path)
  }

  if (!open) return null

  return (
    <div
      className="command-palette-backdrop"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <div
        className="command-palette-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        data-command-palette-root
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="search"
          className="command-palette-input"
          placeholder="Jump to symbol, alpha, backtest, or page…"
          autoComplete="off"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              onClose()
            }
          }}
        />
        <div className="command-palette-hint muted small">
          <span className="tabular-nums">⌘K</span> / Ctrl+K · Enter selects · Esc closes
        </div>

        <div className="command-palette-body">
          {!needle && (
            <section className="command-palette-section">
              <div className="command-palette-section-title">Go to</div>
              <button type="button" className="command-palette-row" onClick={() => go('/')}>
                <span className="command-palette-k">Home</span>
              </button>
              <button type="button" className="command-palette-row" onClick={() => go('/studio')}>
                <span className="command-palette-k">Alpha Studio</span>
                <span className="command-palette-meta muted small">Edit &amp; run</span>
              </button>
              <button type="button" className="command-palette-row" onClick={() => go('/backtests')}>
                <span className="command-palette-k">Backtests list</span>
              </button>
              <button type="button" className="command-palette-row" onClick={() => go('/data')}>
                <span className="command-palette-k">Data summary</span>
              </button>
            </section>
          )}

          {debounced.length >= 1 && (
            <section className="command-palette-section">
              <div className="command-palette-section-title">Instruments</div>
              {searchQ.isLoading && <div className="command-palette-muted">Searching…</div>}
              {searchQ.isError && (
                <div className="command-palette-muted">Instrument search failed.</div>
              )}
              {!searchQ.isLoading &&
                !searchQ.isError &&
                quoteHits.length === 0 &&
                debounced.length >= 1 && (
                  <div className="command-palette-muted">No matching instruments.</div>
                )}
              {quoteHits.map((row) => (
                <button
                  key={`${row.symbol}-${row.exchange ?? ''}`}
                  type="button"
                  className="command-palette-row"
                  onClick={() =>
                    go(`/instruments/${encodeURIComponent(row.symbol)}`)
                  }
                >
                  <span className="command-palette-k mono">{row.symbol}</span>
                  <span className="command-palette-meta muted small">
                    {row.shortname ?? row.longname ?? ''}
                  </span>
                </button>
              ))}
            </section>
          )}

          <section className="command-palette-section">
            <div className="command-palette-section-title">Alphas</div>
            {alphasQ.isLoading && <div className="command-palette-muted">Loading alphas…</div>}
            {!alphasQ.isLoading && alphaHits.length === 0 && needle && (
              <div className="command-palette-muted">No matching alphas.</div>
            )}
            {alphaHits.map((a) => (
              <button
                key={a.id}
                type="button"
                className="command-palette-row"
                onClick={() => go(`/studio/${encodeURIComponent(a.id)}`)}
              >
                <span className="command-palette-k">{a.name}</span>
                <span className="command-palette-meta muted small mono">{a.id.slice(0, 8)}…</span>
              </button>
            ))}
          </section>

          <section className="command-palette-section">
            <div className="command-palette-section-title">Recent backtests</div>
            {backtestsQ.isLoading && <div className="command-palette-muted">Loading…</div>}
            {!backtestsQ.isLoading && jobHits.length === 0 && needle && (
              <div className="command-palette-muted">No matching jobs.</div>
            )}
            {jobHits.map((j) => (
              <button
                key={j.id}
                type="button"
                className="command-palette-row"
                onClick={() => go(`/backtests/${encodeURIComponent(j.id)}`)}
              >
                <span className="command-palette-k mono tabular-nums">{j.id.slice(0, 8)}…</span>
                <span className="command-palette-meta muted small">
                  {j.alpha_name ?? j.alpha_id} · {j.status}
                </span>
              </button>
            ))}
          </section>
        </div>
      </div>
    </div>
  )
}
