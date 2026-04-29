import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { BacktestResultPayload } from '../api/types'
import {
  type EquityChartRow,
  adaptEquityCurve,
  adaptTurnoverHistory,
  formatMetricNumber,
} from '../lib/backtestCharts'

const chartAxisStyle = { fontSize: 11, fill: 'var(--text-muted)' }

function tickDate(ms: number): string {
  try {
    return new Date(ms).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
    })
  } catch {
    return ''
  }
}

function KpiChip({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="table-wrap"
      style={{
        padding: '0.65rem 0.85rem',
        minWidth: '7rem',
        flex: '1 1 8rem',
      }}
    >
      <div className="muted" style={{ fontSize: '0.75rem', marginBottom: '0.2rem' }}>
        {label}
      </div>
      <div className="mono" style={{ fontSize: '1rem', fontWeight: 600 }}>
        {value}
      </div>
    </div>
  )
}

function BenchmarkPanel({ benchmark }: { benchmark: Record<string, unknown> }) {
  const err = benchmark.error
  if (err != null && String(err).length > 0) {
    return (
      <div className="table-wrap dashboard-chart-panel">
        <div className="dashboard-chart-title">Benchmark</div>
        <p className="muted" style={{ margin: 0, fontSize: '0.875rem' }}>
          {String(err)}
        </p>
      </div>
    )
  }

  const ticker = typeof benchmark.ticker === 'string' ? benchmark.ticker : null
  const cor = benchmark.correlation
  const nOverlap = benchmark.n_overlap
  const benchTr = benchmark.benchmark_total_return_pct

  return (
    <div className="table-wrap dashboard-chart-panel">
      <div className="dashboard-chart-title">Benchmark</div>
      <dl className="row" style={{ flexWrap: 'wrap', gap: '1rem', margin: 0 }}>
        {ticker && (
          <div>
            <dt className="muted" style={{ fontSize: '0.75rem' }}>
              Ticker
            </dt>
            <dd className="mono" style={{ margin: 0 }}>
              {ticker}
            </dd>
          </div>
        )}
        <div>
          <dt className="muted" style={{ fontSize: '0.75rem' }}>
            Correlation (vs strategy returns)
          </dt>
          <dd className="mono" style={{ margin: 0 }}>
            {formatMetricNumber(cor, 4)}
          </dd>
        </div>
        <div>
          <dt className="muted" style={{ fontSize: '0.75rem' }}>
            Overlap bars
          </dt>
          <dd className="mono" style={{ margin: 0 }}>
            {typeof nOverlap === 'number' && Number.isFinite(nOverlap)
              ? String(nOverlap)
              : '—'}
          </dd>
        </div>
        <div>
          <dt className="muted" style={{ fontSize: '0.75rem' }}>
            Benchmark total return %
          </dt>
          <dd className="mono" style={{ margin: 0 }}>
            {typeof benchTr === 'number' && Number.isFinite(benchTr)
              ? `${benchTr.toFixed(2)}%`
              : '—'}
          </dd>
        </div>
      </dl>
    </div>
  )
}

const tooltipStyle = {
  background: 'var(--surface-panel)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  color: 'var(--text)',
  fontSize: '0.8125rem',
}

function DrawdownAreaChart({ points }: { points: EquityChartRow[] }) {
  return (
    <AreaChart data={points} margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
      <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
      <XAxis
        type="number"
        dataKey="t"
        domain={['dataMin', 'dataMax']}
        tickFormatter={tickDate}
        tick={chartAxisStyle}
        scale="time"
      />
      <YAxis tick={chartAxisStyle} tickFormatter={(v) => `${v}%`} />
      <Tooltip
        contentStyle={tooltipStyle}
        labelFormatter={(ms) => (typeof ms === 'number' ? new Date(ms).toLocaleString() : '')}
      />
      <Area
        type="monotone"
        dataKey="drawdownPct"
        name="Drawdown %"
        stroke="var(--border-strong)"
        fill="var(--accent-muted)"
        fillOpacity={0.35}
        isAnimationActive={false}
      />
    </AreaChart>
  )
}

function pctLabel(v: unknown, digits: number): string {
  const s = formatMetricNumber(v, digits)
  return s === '—' ? '—' : `${s}%`
}

export default function BacktestResultCharts({ data }: { data: BacktestResultPayload }) {
  const equityPts = useMemo(() => adaptEquityCurve(data.equity_curve), [data.equity_curve])
  const turnoverPts = useMemo(
    () => adaptTurnoverHistory(data.turnover_history, data.equity_curve),
    [data.turnover_history, data.equity_curve],
  )

  const m = data.metrics
  const headline = (
    <div className="row" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
      <KpiChip label="Total return %" value={pctLabel(m.total_return_pct, 2)} />
      <KpiChip label="Sharpe" value={formatMetricNumber(m.sharpe_ratio, 3)} />
      <KpiChip label="Max drawdown %" value={pctLabel(m.max_drawdown_pct, 2)} />
    </div>
  )

  const hasBenchmark = data.benchmark != null && typeof data.benchmark === 'object'

  return (
    <div className="stack" style={{ gap: '1rem' }}>
      {headline}

      {hasBenchmark && <BenchmarkPanel benchmark={data.benchmark as Record<string, unknown>} />}

      {equityPts.length > 0 && (
        <div className="table-wrap dashboard-chart-panel">
          <div className="dashboard-chart-title">Portfolio equity</div>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={equityPts} margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="t"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={tickDate}
                  tick={chartAxisStyle}
                  scale="time"
                />
                <YAxis
                  tick={chartAxisStyle}
                  domain={['auto', 'auto']}
                  tickFormatter={(v) =>
                    typeof v === 'number' && Math.abs(v) >= 1e6
                      ? `${(v / 1e6).toFixed(2)}M`
                      : typeof v === 'number' && Math.abs(v) >= 1e3
                        ? `${(v / 1e3).toFixed(1)}k`
                        : String(v)
                  }
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(ms) => (typeof ms === 'number' ? new Date(ms).toLocaleString() : '')}
                  formatter={(value: number, name: string) => [
                    name === 'Equity' || name === 'equity'
                      ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                      : value,
                    name === 'Equity' || name === 'equity' ? 'Equity' : name,
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="equity"
                  name="Equity"
                  stroke="var(--accent)"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {equityPts.length > 0 && (
        <div className="table-wrap dashboard-chart-panel">
          <div className="dashboard-chart-title">Drawdown %</div>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <DrawdownAreaChart points={equityPts} />
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {turnoverPts.length > 0 && (
        <div className="table-wrap dashboard-chart-panel">
          <div className="dashboard-chart-title">Turnover (USD per rebalance; % of equity)</div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <ComposedChart data={turnoverPts} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="t"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={tickDate}
                  tick={chartAxisStyle}
                  scale="time"
                />
                <YAxis
                  yAxisId="usd"
                  orientation="left"
                  tick={chartAxisStyle}
                  tickFormatter={(v) =>
                    typeof v === 'number' && Math.abs(v) >= 1e6
                      ? `${(v / 1e6).toFixed(1)}M`
                      : typeof v === 'number' && Math.abs(v) >= 1e3
                        ? `${(v / 1e3).toFixed(0)}k`
                        : String(v)
                  }
                  label={{
                    value: 'USD',
                    angle: -90,
                    position: 'insideLeft',
                    fill: 'var(--text-muted)',
                    fontSize: 11,
                  }}
                />
                <YAxis
                  yAxisId="pct"
                  orientation="right"
                  tick={chartAxisStyle}
                  tickFormatter={(v) => `${v}%`}
                  label={{
                    value: '% equity',
                    angle: 90,
                    position: 'insideRight',
                    fill: 'var(--text-muted)',
                    fontSize: 11,
                  }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(ms) => (typeof ms === 'number' ? new Date(ms).toLocaleString() : '')}
                />
                <Legend />
                <Bar
                  yAxisId="usd"
                  dataKey="turnoverUsd"
                  name="Turnover USD"
                  fill="var(--accent-muted)"
                  stroke="var(--accent)"
                  radius={[2, 2, 0, 0]}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="pct"
                  type="monotone"
                  dataKey="turnoverPct"
                  name="Turnover % equity"
                  stroke="var(--success)"
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {equityPts.length === 0 && turnoverPts.length === 0 && (
        <p className="muted">No equity or turnover series to chart.</p>
      )}
    </div>
  )
}
