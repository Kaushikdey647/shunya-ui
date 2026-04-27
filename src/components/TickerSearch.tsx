import { useCallback, useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { searchInstruments } from '../api/endpoints'
import type { InstrumentSearchQuote } from '../api/types'

const DEBOUNCE_MS = 300
const MIN_QUERY = 1

function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), ms)
    return () => window.clearTimeout(t)
  }, [value, ms])
  return debounced
}

export default function TickerSearch() {
  const navigate = useNavigate()
  const listId = useId()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const debounced = useDebouncedValue(q.trim(), DEBOUNCE_MS)

  const searchQ = useQuery({
    queryKey: ['instrument-search', debounced],
    queryFn: () => searchInstruments(debounced),
    enabled: debounced.length >= MIN_QUERY,
    staleTime: 30_000,
  })

  const quotes = searchQ.data?.quotes ?? []

  const goSearch = useCallback(
    (query: string) => {
      const t = query.trim()
      if (!t) return
      setOpen(false)
      navigate(`/search?q=${encodeURIComponent(t)}`)
    },
    [navigate],
  )

  const goInstrument = useCallback(
    (symbol: string) => {
      setOpen(false)
      setQ('')
      navigate(`/instruments/${encodeURIComponent(symbol)}`)
    },
    [navigate],
  )

  return (
    <div className="ticker-search">
      <input
        type="search"
        className="ticker-search-input"
        placeholder="Symbol or company…"
        autoComplete="off"
        maxLength={64}
        aria-label="Search tickers"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-autocomplete="list"
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 180)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            goSearch(q)
          }
        }}
      />
      {open && debounced.length >= MIN_QUERY && (
        <div id={listId} className="ticker-search-dropdown" role="listbox">
          {searchQ.isLoading && <div className="ticker-search-item muted">Searching…</div>}
          {searchQ.isError && (
            <div className="ticker-search-item muted">Search failed</div>
          )}
          {!searchQ.isLoading && !searchQ.isError && quotes.length === 0 && (
            <div className="ticker-search-item muted">No matches</div>
          )}
          {quotes.slice(0, 8).map((row: InstrumentSearchQuote) => (
            <button
              key={`${row.symbol}-${row.exchange ?? ''}`}
              type="button"
              role="option"
              className="ticker-search-item"
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => goInstrument(row.symbol)}
            >
              <span className="ticker-search-symbol">{row.symbol}</span>
              {row.shortname || row.longname ? (
                <span className="ticker-search-name">{row.shortname ?? row.longname}</span>
              ) : null}
            </button>
          ))}
          <button
            type="button"
            className="ticker-search-footer"
            onMouseDown={(ev) => ev.preventDefault()}
            onClick={() => goSearch(q)}
          >
            View all results
          </button>
        </div>
      )}
    </div>
  )
}
