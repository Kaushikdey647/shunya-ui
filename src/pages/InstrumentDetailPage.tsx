import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getInstrumentNews, getInstrumentOhlcv } from '../api/endpoints'
import ApiErrorAlert from '../components/ApiErrorAlert'
import InstrumentChart from '../components/InstrumentChart'

type Preset = { id: string; label: string; interval: string; period: string }

const TIMEFRAMES: Preset[] = [
  { id: '1d', label: '1D', interval: '5m', period: '1d' },
  { id: '5d', label: '5D', interval: '15m', period: '5d' },
  { id: '1m', label: '1M', interval: '1h', period: '1mo' },
  { id: '3m', label: '3M', interval: '1d', period: '3mo' },
  { id: '6m', label: '6M', interval: '1d', period: '6mo' },
  { id: '1y', label: '1Y', interval: '1d', period: '1y' },
  { id: '5y', label: '5Y', interval: '1wk', period: '5y' },
  { id: 'max', label: 'All', interval: '1mo', period: 'max' },
]

function normalizeSymbol(raw: string | undefined): string | null {
  if (!raw) return null
  const s = decodeURIComponent(raw).trim().toUpperCase()
  if (!/^[A-Z0-9^.-]{1,32}$/.test(s)) return null
  return s
}

export default function InstrumentDetailPage() {
  const { symbol: symbolParam } = useParams<{ symbol: string }>()
  const symbol = useMemo(() => normalizeSymbol(symbolParam), [symbolParam])
  const [preset, setPreset] = useState<Preset>(() => TIMEFRAMES[5]!)

  const ohlcv = useQuery({
    queryKey: ['instrument-ohlcv', symbol, preset.interval, preset.period],
    queryFn: () =>
      getInstrumentOhlcv(symbol!, {
        interval: preset.interval,
        period: preset.period,
      }),
    enabled: symbol != null,
  })

  const newsQuery = useQuery({
    queryKey: ['instrument-news', symbol],
    queryFn: () => getInstrumentNews(symbol!),
    enabled: symbol != null,
    staleTime: 60_000,
  })

  const newsRows = newsQuery.data?.news

  if (!symbol) {
    return (
      <div className="page-inner stack">
        <h1>Invalid symbol</h1>
        <p className="muted">Use a valid ticker (letters, numbers, . - ^).</p>
        <Link to="/search">Back to search</Link>
      </div>
    )
  }

  const yahooUrl = `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`

  return (
    <div className="page-inner stack">
      <div className="instrument-header">
        <h1 className="instrument-symbol">{symbol}</h1>
        <a href={yahooUrl} target="_blank" rel="noopener noreferrer">
          Yahoo Finance
        </a>
        <Link to={`/search?q=${encodeURIComponent(symbol)}`} className="muted">
          Search again
        </Link>
      </div>

      <div className="timeframe-bar" role="toolbar" aria-label="Timeframe">
        {TIMEFRAMES.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`timeframe-btn${p.id === preset.id ? ' timeframe-btn-active' : ''}`}
            onClick={() => setPreset(p)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {ohlcv.isLoading && <p className="muted">Loading chart…</p>}
      <ApiErrorAlert error={ohlcv.error} />
      <ApiErrorAlert error={newsQuery.error} />
      {ohlcv.data?.storage_error && (
        <div className="alert alert-error" role="alert">
          {ohlcv.data.storage_error}
        </div>
      )}
      {ohlcv.data?.storage_status === 'deferred' && ohlcv.data.storage_job_id != null && (
        <p className="muted">
          Database sync queued (job {ohlcv.data.storage_job_id}).
        </p>
      )}
      {ohlcv.data && ohlcv.data.bars.length === 0 && !ohlcv.isLoading && (
        <p className="muted">No bars returned for this range.</p>
      )}
      {ohlcv.data && ohlcv.data.bars.length > 0 && (
        <InstrumentChart
          bars={ohlcv.data.bars}
          news={newsRows}
          key={`${preset.id}-${symbol}`}
        />
      )}
    </div>
  )
}
