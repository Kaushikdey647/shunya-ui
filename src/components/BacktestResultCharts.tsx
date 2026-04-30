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
import MonthlyReturnsHeatmap from './MonthlyReturnsHeatmap'

const chartAxisStyle = {
  fontSize: 11,
  fill: 'var(--text-muted)',
  fontVariantNumeric: 'tabular-nums' as const,
}

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

function BenchmarkPanel({ benchmark }: { benchmark: Record<string, unknown> }) {
  const err = benchmark.error
  if (err != null && String(err).length > 0) {
    return (
      <div className="dashboard-chart-panel" style={{ padding: '0.5rem 0' }}>
        <div className="dashboard-chart-title" style={{ fontSize: '0.85rem' }}>
          Benchmark
        </div>
        <p className="muted" style={{ margin: 0, fontSize: '0.8125rem' }}>
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
    <div className="dashboard-chart-panel" style={{ padding: '0.5rem 0' }}>
      <div className="dashboard-chart-title" style={{ fontSize: '0.85rem' }}>
        Benchmark
      </div>
      <dl className="row" style={{ flexWrap: 'wrap', gap: '1rem', margin: 0 }}>
        {ticker && (
          <div>
            <dt className="muted" style={{ fontSize: '0.72rem' }}>
              Ticker
            </dt>
            <dd className="mono" style={{ margin: 0 }}>
              {ticker}
            </dd>
          </div>
        )}
        <div>
          <dt className="muted" style={{ fontSize: '0.72rem' }}>
            Correlation (vs strategy returns)
          </dt>
          <dd className="mono" style={{ margin: 0 }}>
            {formatMetricNumber(cor, 4)}
          </dd>
        </div>
        <div>
          <dt className="muted" style={{ fontSize: '0.72rem' }}>
            Overlap bars
          </dt>
          <dd className="mono" style={{ margin: 0 }}>
            {typeof nOverlap === 'number' && Number.isFinite(nOverlap)
              ? String(nOverlap)
              : '—'}
          </dd>
        </div>
        <div>
          <dt className="muted" style={{ fontSize: '0.72rem' }}>
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

function DrawdownAreaChart({
  points,
  xDomain,
}: {
  points: EquityChartRow[]
  xDomain: [number, number]
}) {
  return (
    <AreaChart data={points} margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
      <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
      <XAxis
        type="number"
        dataKey="t"
        domain={xDomain}
        tickFormatter={tickDate}
        tick={chartAxisStyle}
        scale="time"
      />
      <YAxis tick={chartAxisStyle} tickFormatter={(v) => `${v}%`} domain={['dataMin', 0]} />
      <Tooltip
        contentStyle={tooltipStyle}
        labelFormatter={(ms) => (typeof ms === 'number' ? new Date(ms).toLocaleString() : '')}
      />
      <Area
        type="monotone"
        dataKey="drawdownPct"
        name="Drawdown %"
        stroke="var(--error)"
        fill="var(--error-bg)"
        fillOpacity={0.55}
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

  const xDomain = useMemo((): [number, number] | null => {
    if (equityPts.length === 0) return null
    return [equityPts[0]!.t, equityPts[equityPts.length - 1]!.t]
  }, [equityPts])

  const m = data.metrics
  const hasBenchmark = data.benchmark != null && typeof data.benchmark === 'object'

  const hero = (
    <div className="tearsheet-hero-row">
      <div className="tearsheet-hero-metric">
        <div className="tearsheet-hero-label">CAGR</div>
        <div className="tearsheet-hero-value">{pctLabel(m.cagr_pct, 2)}</div>
      </div>
      <div className="tearsheet-hero-metric">
        <div className="tearsheet-hero-label">Sharpe</div>
        <div className="tearsheet-hero-value">{formatMetricNumber(m.sharpe_ratio, 3)}</div>
      </div>
      <div className="tearsheet-hero-metric">
        <div className="tearsheet-hero-label">Max drawdown</div>
        <div className="tearsheet-hero-value">{pctLabel(m.max_drawdown_pct, 2)}</div>
      </div>
      <div className="tearsheet-hero-metric">
        <div className="tearsheet-hero-label">Win rate</div>
        <div className="tearsheet-hero-value">{pctLabel(m.win_rate_pct, 1)}</div>
      </div>
    </div>
  )

  return (
    <div className="stack" style={{ gap: '1.25rem' }}>
      {hero}

      {equityPts.length > 0 && xDomain && (
        <div className="table-wrap dashboard-chart-panel">
          <div className="dashboard-chart-title">Performance</div>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={equityPts} margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="t"
                  domain={xDomain}
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
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ width: '100%', height: 160, marginTop: '0.25rem' }}>
            <ResponsiveContainer>
              <DrawdownAreaChart points={equityPts} xDomain={xDomain} />
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {equityPts.length > 0 && <MonthlyReturnsHeatmap equityCurve={data.equity_curve} />}

      {(hasBenchmark || turnoverPts.length > 0) && (
        <details className="advanced">
          <summary>Benchmark &amp; turnover</summary>
          <div className="stack" style={{ gap: '1rem', marginTop: '0.75rem' }}>
            {hasBenchmark && (
              <BenchmarkPanel benchmark={data.benchmark as Record<string, unknown>} />
            )}
            {turnoverPts.length > 0 && (
              <div className="dashboard-chart-panel">
                <div className="dashboard-chart-title" style={{ fontSize: '0.85rem' }}>
                  Turnover (USD per rebalance; % of equity)
                </div>
                <div style={{ width: '100%', height: 280 }}>
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
                        labelFormatter={(ms) =>
                          typeof ms === 'number' ? new Date(ms).toLocaleString() : ''
                        }
                      />
                      <Legend />
                      <Bar
                        yAxisId="usd"
                        dataKey="turnoverUsd"
                        name="Turnover USD"
                        fill="var(--surface-hover)"
                        stroke="var(--border-strong)"
                        radius={[2, 2, 0, 0]}
                        isAnimationActive={false}
                      />
                      <Line
                        yAxisId="pct"
                        type="monotone"
                        dataKey="turnoverPct"
                        name="Turnover % equity"
                        stroke="var(--border-strong)"
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
          </div>
        </details>
      )}

      {equityPts.length === 0 && turnoverPts.length === 0 && (
        <p className="muted">No equity or turnover series to chart.</p>
      )}
    </div>
  )
}
