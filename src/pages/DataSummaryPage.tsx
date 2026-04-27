import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getDataDashboard } from '../api/endpoints'
import type {
  ClassificationLabelCount,
  DashboardBucketParam,
  TickerDashboardRow,
} from '../api/types'
import ApiErrorAlert from '../components/ApiErrorAlert'

const INTERVAL_OPTIONS = [
  '1m',
  '2m',
  '5m',
  '15m',
  '30m',
  '60m',
  '90m',
  '1h',
  '1d',
  '5d',
  '1wk',
  '1mo',
  '3mo',
] as const

const BUCKET_OPTIONS: DashboardBucketParam[] = ['auto', 'day', 'week', 'month']

type SortKey =
  | 'ticker'
  | 'completeness_pct'
  | 'longest_run_buckets'
  | 'return_pct'
  | 'risk_ann_pct'
  | 'sharpe'
  | 'raw_bar_count'

const chartAxisStyle = { fontSize: 11, fill: 'var(--text-muted)' }

const PIE_PALETTE = [
  'var(--accent)',
  'var(--accent-muted)',
  'var(--success)',
  'var(--border-strong)',
  'var(--text-muted)',
  '#7c9cbf',
  '#9b8dc9',
  '#c98d8d',
  '#8dc9a8',
  '#c9b38d',
  '#8db4c9',
  '#b0b0b0',
]

function collapseClassificationCounts(
  counts: ClassificationLabelCount[],
  maxSlices = 12,
): { name: string; value: number }[] {
  if (!counts.length) return []
  const sorted = [...counts].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
  if (sorted.length <= maxSlices) {
    return sorted.map((c) => ({ name: c.label, value: c.count }))
  }
  const head = sorted.slice(0, maxSlices - 1)
  const tail = sorted.slice(maxSlices - 1)
  const otherSum = tail.reduce((s, x) => s + x.count, 0)
  return [...head.map((c) => ({ name: c.label, value: c.count })), { name: 'Other', value: otherSum }]
}

function formatPct(n: number | null | undefined, digits = 2): string {
  if (n == null || Number.isNaN(n)) return '—'
  return `${n.toFixed(digits)}%`
}

function formatNum(n: number | null | undefined, digits = 2): string {
  if (n == null || Number.isNaN(n)) return '—'
  return n.toFixed(digits)
}

export default function DataSummaryPage() {
  const [interval, setInterval] = useState('1d')
  const [bucket, setBucket] = useState<DashboardBucketParam>('auto')
  const [sortKey, setSortKey] = useState<SortKey>('ticker')
  const [sortAsc, setSortAsc] = useState(true)

  const query = useQuery({
    queryKey: ['dataDashboard', interval, bucket],
    queryFn: () => getDataDashboard({ interval, bucket }),
  })

  const data = query.data

  const sortedTickers = useMemo(() => {
    if (!data?.tickers.length) return []
    const rows = [...data.tickers]
    rows.sort((a, b) => {
      const dir = sortAsc ? 1 : -1
      const av = a[sortKey]
      const bv = b[sortKey]
      if (sortKey === 'ticker') {
        return dir * String(av).localeCompare(String(bv))
      }
      const an = typeof av === 'number' ? av : Number.NEGATIVE_INFINITY
      const bn = typeof bv === 'number' ? bv : Number.NEGATIVE_INFINITY
      if (an === bn) return 0
      return dir * (an < bn ? -1 : 1)
    })
    return rows
  }, [data?.tickers, sortAsc, sortKey])

  const scatterPoints = useMemo(() => {
    if (!data?.tickers) return []
    return data.tickers
      .filter(
        (t) =>
          t.risk_ann_pct != null &&
          t.return_pct != null &&
          Number.isFinite(t.risk_ann_pct) &&
          Number.isFinite(t.return_pct),
      )
      .map((t) => ({
        ticker: t.ticker,
        x: t.risk_ann_pct as number,
        y: t.return_pct as number,
        sharpe: t.sharpe,
        bars: t.raw_bar_count,
      }))
  }, [data?.tickers])

  const histogramBars = useMemo(() => {
    if (!data?.completeness_histogram) return []
    return data.completeness_histogram.map((count, i) => ({
      label: `${i * 10}–${i === 9 ? '100' : String((i + 1) * 10)}`,
      count,
    }))
  }, [data?.completeness_histogram])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc)
    else {
      setSortKey(key)
      setSortAsc(key === 'ticker' ? true : false)
    }
  }

  return (
    <div className="page-inner stack">
      <div className="row">
        <Link to="/" className="btn">
          ← Home
        </Link>
      </div>

      <header className="stack" style={{ gap: '0.35rem' }}>
        <h1>Data integrity & analytics</h1>
        <p className="muted">
          Coverage across the database reference window (global span for this interval and source),
          plus risk–return positioning from stored closes. Refresh pulls the latest Timescale snapshot.
        </p>
      </header>

      <div className="row" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label className="muted" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          Interval
          <select
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            style={{ minWidth: '6rem' }}
          >
            {INTERVAL_OPTIONS.map((iv) => (
              <option key={iv} value={iv}>
                {iv}
              </option>
            ))}
          </select>
        </label>
        <label className="muted" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          Coverage buckets
          <select
            value={bucket}
            onChange={(e) => setBucket(e.target.value as DashboardBucketParam)}
            style={{ minWidth: '7rem' }}
          >
            {BUCKET_OPTIONS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-primary" onClick={() => query.refetch()} disabled={query.isFetching}>
          {query.isFetching ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <ApiErrorAlert error={query.error} />

      {query.isLoading && <p className="muted">Loading dashboard…</p>}

      {data && (
        <>
          <section className="dashboard-kpi-row row" style={{ gap: '1rem', flexWrap: 'wrap' }}>
            <KpiCard
              title="Reference window"
              value={`${data.reference_start.slice(0, 10)} → ${data.reference_end.slice(0, 10)}`}
            />
            <KpiCard title="Tickers" value={String(data.ticker_count)} hint={data.truncated ? 'truncated (see env)' : undefined} />
            <KpiCard
              title="Mean completeness"
              value={`${data.aggregate_mean_completeness_pct.toFixed(1)}%`}
            />
            <KpiCard
              title="Median completeness"
              value={`${data.aggregate_median_completeness_pct.toFixed(1)}%`}
            />
            <KpiCard
              title="Heatmap columns"
              value={`${data.bucket_count} (${data.bucket_granularity}${data.bucket_auto_subsampled ? ', merged' : ''})`}
            />
          </section>

          <p className="muted" style={{ fontSize: '0.8125rem', maxWidth: '52rem' }}>
            Metrics use consecutive stored closes in the reference window (same semantics as{' '}
            <code className="mono">POST /data</code>). Gaps reduce completeness but do not insert synthetic bars.
            Annualized volatility and Sharpe use bar cadence <strong>{data.bar_unit}</strong> step{' '}
            <strong>{data.bar_step}</strong> (~{data.periods_per_year.toFixed(0)} periods/year).
          </p>

          <section className="stack" style={{ gap: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Classifications</h2>
            <p className="muted" style={{ fontSize: '0.8125rem', margin: 0 }}>
              Ticker counts by latest yfinance classification row per symbol (same universe as the heatmap).
            </p>
            <div className="dashboard-chart-grid">
              <ClassificationPiePanel title="Sector" counts={data.sector_counts ?? []} />
              <ClassificationPiePanel title="Industry" counts={data.industry_counts ?? []} />
              <ClassificationPiePanel title="Sub-industry" counts={data.sub_industry_counts ?? []} />
            </div>
          </section>

          <div className="dashboard-chart-grid">
            <div className="table-wrap dashboard-chart-panel">
              <div className="dashboard-chart-title">Risk vs return</div>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="Vol"
                      unit="%"
                      tick={chartAxisStyle}
                      label={{ value: 'Annualized volatility %', position: 'bottom', offset: 0, fill: 'var(--text-muted)', fontSize: 11 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="Return"
                      unit="%"
                      tick={chartAxisStyle}
                      label={{ value: 'Total return %', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 11 }}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const p = payload[0].payload as (typeof scatterPoints)[0]
                        return (
                          <div
                            className="muted"
                            style={{
                              padding: '0.35rem 0.5rem',
                              fontSize: '0.8125rem',
                              background: 'var(--surface-panel)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius)',
                            }}
                          >
                            <strong style={{ color: 'var(--text-strong)' }}>{p.ticker}</strong>
                            <div>Return: {p.y.toFixed(2)}%</div>
                            <div>Vol: {p.x.toFixed(2)}%</div>
                            <div>Sharpe: {p.sharpe != null ? p.sharpe.toFixed(2) : '—'}</div>
                            <div>Bars: {p.bars ?? '—'}</div>
                          </div>
                        )
                      }}
                    />
                    <Scatter
                      name="Tickers"
                      data={scatterPoints}
                      fill="var(--accent)"
                      isAnimationActive={false}
                      shape={(raw: unknown) => {
                        const p = raw as { cx?: number; cy?: number }
                        if (p.cx == null || p.cy == null) return <g />
                        return (
                          <circle
                            cx={p.cx}
                            cy={p.cy}
                            r={3}
                            fill="var(--accent)"
                            stroke="var(--accent)"
                            strokeWidth={1}
                            fillOpacity={0.88}
                          />
                        )
                      }}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="table-wrap dashboard-chart-panel">
              <div className="dashboard-chart-title">Completeness distribution</div>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={histogramBars} margin={{ top: 8, right: 8, bottom: 40, left: 8 }}>
                    <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={chartAxisStyle} interval={0} angle={-35} textAnchor="end" height={60} />
                    <YAxis tick={chartAxisStyle} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--surface-panel)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        color: 'var(--text)',
                      }}
                    />
                    <Bar dataKey="count" fill="var(--accent-muted)" stroke="var(--accent)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="muted" style={{ padding: '0 0.65rem 0.65rem', fontSize: '0.75rem', margin: 0 }}>
                Count of tickers by completeness % bucket (full span of heatmap columns).
              </p>
            </div>
          </div>

          <section className="stack">
            <h2>Coverage heatmap</h2>
            <p className="muted">
              Rows are tickers; columns are time buckets (green = at least one bar). Axis uses{' '}
              <code className="mono">{data.interval}</code> / <code className="mono">{data.source}</code>.
            </p>
            <Heatmap rows={sortedTickers} buckets={data.buckets} />
          </section>

          <section className="stack">
            <h2>Instruments</h2>
            <div className="table-wrap dashboard-instruments-scroll">
              <table className="data">
                <thead>
                  <tr>
                    <SortTh label="Ticker" k="ticker" active={sortKey} asc={sortAsc} onToggle={toggleSort} />
                    <SortTh label="Completeness %" k="completeness_pct" active={sortKey} asc={sortAsc} onToggle={toggleSort} />
                    <SortTh label="Longest run" k="longest_run_buckets" active={sortKey} asc={sortAsc} onToggle={toggleSort} />
                    <SortTh label="Bars" k="raw_bar_count" active={sortKey} asc={sortAsc} onToggle={toggleSort} />
                    <SortTh label="Return %" k="return_pct" active={sortKey} asc={sortAsc} onToggle={toggleSort} />
                    <SortTh label="Vol ann. %" k="risk_ann_pct" active={sortKey} asc={sortAsc} onToggle={toggleSort} />
                    <SortTh label="Sharpe" k="sharpe" active={sortKey} asc={sortAsc} onToggle={toggleSort} />
                    <th className="muted">First bar</th>
                    <th className="muted">Last bar</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTickers.map((row) => (
                    <tr key={row.ticker}>
                      <td className="mono">{row.ticker}</td>
                      <td>{formatPct(row.completeness_pct)}</td>
                      <td>{row.longest_run_buckets}</td>
                      <td>{row.raw_bar_count}</td>
                      <td>{formatPct(row.return_pct)}</td>
                      <td>{formatPct(row.risk_ann_pct)}</td>
                      <td>{formatNum(row.sharpe, 3)}</td>
                      <td className="mono muted">{row.first_ts?.slice(0, 10) ?? '—'}</td>
                      <td className="mono muted">{row.last_ts?.slice(0, 10) ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function ClassificationPiePanel({
  title,
  counts,
}: {
  title: string
  counts: ClassificationLabelCount[]
}) {
  const pieData = useMemo(() => collapseClassificationCounts(counts), [counts])
  const total = useMemo(() => pieData.reduce((s, x) => s + x.value, 0), [pieData])

  if (!pieData.length) {
    return (
      <div className="table-wrap dashboard-chart-panel">
        <div className="dashboard-chart-title">{title}</div>
        <p className="muted" style={{ padding: '1rem', margin: 0, fontSize: '0.875rem' }}>
          No classification rows for this universe.
        </p>
      </div>
    )
  }

  return (
    <div className="table-wrap dashboard-chart-panel">
      <div className="dashboard-chart-title">{title}</div>
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={78}
              paddingAngle={1}
              stroke="var(--border)"
              strokeWidth={1}
              isAnimationActive={false}
            >
              {pieData.map((entry, i) => (
                <Cell key={`${entry.name}-${i}`} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'var(--surface-panel)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                color: 'var(--text)',
                fontSize: '0.8125rem',
              }}
              formatter={(value: number) =>
                total > 0
                  ? [`${value} (${((value / total) * 100).toFixed(1)}%)`, 'Tickers']
                  : [`${value}`, 'Tickers']
              }
            />
            <Legend
              wrapperStyle={{ fontSize: '0.72rem' }}
              formatter={(value) => <span style={{ color: 'var(--text-muted)' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function KpiCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div
      style={{
        minWidth: '10rem',
        flex: '1 1 9rem',
        padding: '0.65rem 0.85rem',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        background: 'var(--surface-panel)',
        boxShadow: 'var(--shadow)',
      }}
    >
      <div className="muted" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>
        {title}
      </div>
      <div style={{ fontWeight: 600, color: 'var(--text-strong)', fontSize: '0.95rem' }}>{value}</div>
      {hint && (
        <div className="muted" style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>
          {hint}
        </div>
      )}
    </div>
  )
}

function SortTh({
  label,
  k,
  active,
  asc,
  onToggle,
}: {
  label: string
  k: SortKey
  active: SortKey
  asc: boolean
  onToggle: (k: SortKey) => void
}) {
  const on = active === k
  return (
    <th>
      <button
        type="button"
        onClick={() => onToggle(k)}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          font: 'inherit',
          cursor: 'pointer',
          color: on ? 'var(--accent)' : 'var(--text-muted)',
          fontWeight: on ? 600 : 500,
        }}
      >
        {label}
        {on ? (asc ? ' ↑' : ' ↓') : ''}
      </button>
    </th>
  )
}

function Heatmap({
  rows,
  buckets,
}: {
  rows: TickerDashboardRow[]
  buckets: { index: number; start: string; end: string }[]
}) {
  const n = buckets.length
  if (!n || !rows.length) return <p className="muted">No coverage rows.</p>

  return (
    <div className="table-wrap dashboard-coverage-scroll">
      <div style={{ minWidth: `${88 + n * 3}px` }}>
        <div style={{ display: 'flex', gap: 2, marginBottom: 6, paddingLeft: 88 }}>
          {buckets.map((b, i) => (
            <span
              key={b.index}
              title={`${b.start} → ${b.end}`}
              style={{
                flex: 1,
                minWidth: 2,
                height: 4,
                background: i % 12 === 0 ? 'var(--border-strong)' : 'transparent',
              }}
            />
          ))}
        </div>
        {rows.map((row) => (
          <div
            key={row.ticker}
            style={{
              display: 'flex',
              gap: 2,
              alignItems: 'center',
              marginBottom: 2,
            }}
          >
            <span
              className="mono"
              style={{
                width: 80,
                flexShrink: 0,
                fontSize: '0.75rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                position: 'sticky',
                left: 0,
                background: 'var(--surface-panel)',
                zIndex: 1,
                paddingRight: 6,
              }}
              title={row.ticker}
            >
              {row.ticker}
            </span>
            {row.coverage.map((c, i) => {
              const meta = buckets[i]
              const title = meta ? `${meta.start.slice(0, 10)}→${meta.end.slice(0, 10)}` : ''
              return (
                <span
                  key={i}
                  title={title}
                  style={{
                    flex: 1,
                    minWidth: 2,
                    height: 14,
                    borderRadius: 1,
                    background: c ? 'var(--success)' : 'var(--error)',
                    opacity: c ? 0.88 : 0.28,
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
