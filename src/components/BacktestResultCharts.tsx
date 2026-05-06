import {
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
  useMantineColorScheme,
  useMantineTheme,
} from '@mantine/core'
import type { CSSProperties } from 'react'
import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
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
  adaptTargetHistoryStacked,
  adaptTurnoverHistory,
  equityBarReturns,
  formatMetricNumber,
  periodsPerYearFromMetrics,
  returnHistogramBins,
  rollingSharpeFromEquity,
  summarizeDrawdownAnalysis,
  summarizeReturnsAnalysis,
  summarizeSharpeAnalysis,
  targetHistoryConcentration,
} from '../lib/backtestCharts'
import { useMantineTableDensity } from '../hooks/useMantineTableDensity'
import MonthlyReturnsHeatmap from './MonthlyReturnsHeatmap'

type AxisTick = {
  fontSize: number
  fill: string
  fontVariantNumeric: 'tabular-nums'
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
      <Stack gap="xs">
        <Title order={5} size="sm">
          Benchmark
        </Title>
        <Text size="sm" c="dimmed">
          {String(err)}
        </Text>
      </Stack>
    )
  }

  const ticker = typeof benchmark.ticker === 'string' ? benchmark.ticker : null
  const cor = benchmark.correlation
  const nOverlap = benchmark.n_overlap
  const benchTr = benchmark.benchmark_total_return_pct

  return (
    <Stack gap="xs">
      <Title order={5} size="sm">
        Benchmark
      </Title>
      <Group gap="xl" wrap="wrap">
        {ticker && (
          <Stack gap={2}>
            <Text size="xs" c="dimmed">
              Ticker
            </Text>
            <Text ff="monospace" size="sm">
              {ticker}
            </Text>
          </Stack>
        )}
        <Stack gap={2}>
          <Text size="xs" c="dimmed">
            Correlation (vs strategy returns)
          </Text>
          <Text ff="monospace" size="sm">
            {formatMetricNumber(cor, 4)}
          </Text>
        </Stack>
        <Stack gap={2}>
          <Text size="xs" c="dimmed">
            Overlap bars
          </Text>
          <Text ff="monospace" size="sm">
            {typeof nOverlap === 'number' && Number.isFinite(nOverlap)
              ? String(nOverlap)
              : '—'}
          </Text>
        </Stack>
        <Stack gap={2}>
          <Text size="xs" c="dimmed">
            Benchmark total return %
          </Text>
          <Text ff="monospace" size="sm">
            {typeof benchTr === 'number' && Number.isFinite(benchTr)
              ? `${benchTr.toFixed(2)}%`
              : '—'}
          </Text>
        </Stack>
      </Group>
    </Stack>
  )
}

function DrawdownAreaChart({
  points,
  xDomain,
  axis,
  gridStroke,
  tooltip,
  drawdownStroke,
  drawdownFill,
}: {
  points: EquityChartRow[]
  xDomain: [number, number]
  axis: AxisTick
  gridStroke: string
  tooltip: CSSProperties
  drawdownStroke: string
  drawdownFill: string
}) {
  return (
    <AreaChart data={points} margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
      <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
      <XAxis
        type="number"
        dataKey="t"
        domain={xDomain}
        tickFormatter={tickDate}
        tick={axis}
        scale="time"
      />
      <YAxis tick={axis} tickFormatter={(v) => `${v}%`} domain={['dataMin', 0]} />
      <Tooltip
        contentStyle={tooltip}
        labelFormatter={(ms) => (typeof ms === 'number' ? new Date(ms).toLocaleString() : '')}
      />
      <Area
        type="monotone"
        dataKey="drawdownPct"
        name="Drawdown %"
        stroke={drawdownStroke}
        fill={drawdownFill}
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

function GroupExposureLatestTable({
  rows,
  tableProps,
}: {
  rows: { date: string; gross_by_group: Record<string, unknown>; net_by_group: Record<string, unknown> }[]
  tableProps: ReturnType<typeof useMantineTableDensity>
}) {
  if (rows.length === 0) return null
  const last = rows[rows.length - 1]!
  const gross = last.gross_by_group
  const sorted = Object.entries(gross).sort((a, b) => Number(b[1]) - Number(a[1]))
  if (sorted.length === 0) return null
  return (
    <Paper withBorder p="md" radius="md">
      <Title order={4} size="h5" mb="sm">
        Group / sector exposure (latest bar)
      </Title>
      <Text size="xs" c="dimmed" mb="sm">
        As of {last.date}
      </Text>
      <Table.ScrollContainer minWidth={320}>
        <Table {...tableProps} striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Group</Table.Th>
              <Table.Th>Gross</Table.Th>
              <Table.Th>Net</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sorted.map(([g]) => (
              <Table.Tr key={g}>
                <Table.Td ff="monospace">{g}</Table.Td>
                <Table.Td ff="monospace">{formatMetricNumber(gross[g], 4)}</Table.Td>
                <Table.Td ff="monospace">{formatMetricNumber(last.net_by_group[g], 4)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Paper>
  )
}

function AnalyzerSummaryCard({
  metrics,
  drawdownAnalysis,
  returnsAnalysis,
  sharpeAnalysis,
}: {
  metrics: Record<string, unknown>
  drawdownAnalysis: unknown
  returnsAnalysis: unknown
  sharpeAnalysis: unknown
}) {
  const dd = summarizeDrawdownAnalysis(drawdownAnalysis)
  const ra = summarizeReturnsAnalysis(returnsAnalysis)
  const sa = summarizeSharpeAnalysis(sharpeAnalysis)
  return (
    <Paper withBorder p="md" radius="md">
      <Title order={4} size="h5" mb="sm">
        Backtrader analyzers
      </Title>
      <Text size="xs" c="dimmed" mb="md">
        Trimmed portfolio metrics (cards above) may differ from raw analyzer outputs on the same
        window.
      </Text>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Stack gap={4}>
          <Text size="xs" c="dimmed" tt="uppercase">
            DrawDown (analyzer)
          </Text>
          <Text size="sm">
            Max DD (frac):{' '}
            <Text span ff="monospace">
              {dd.maxDrawdownFrac != null ? formatMetricNumber(dd.maxDrawdownFrac * 100, 2) + '%' : '—'}
            </Text>
          </Text>
          <Text size="sm">
            Max length (bars):{' '}
            <Text span ff="monospace">
              {dd.maxLen != null ? String(dd.maxLen) : '—'}
            </Text>
          </Text>
          <Text size="sm">
            Max money down:{' '}
            <Text span ff="monospace">
              {dd.maxMoneyDown != null ? formatMetricNumber(dd.maxMoneyDown, 0) : '—'}
            </Text>
          </Text>
        </Stack>
        <Stack gap={4}>
          <Text size="xs" c="dimmed" tt="uppercase">
            Returns / Sharpe (analyzer)
          </Text>
          <Text size="sm">
            rtot:{' '}
            <Text span ff="monospace">
              {ra.rtot != null ? pctLabel(ra.rtot * 100, 2) : '—'}
            </Text>
          </Text>
          <Text size="sm">
            ravg (per bar):{' '}
            <Text span ff="monospace">
              {ra.ravg != null ? formatMetricNumber(ra.ravg * 100, 4) + '%' : '—'}
            </Text>
          </Text>
          <Text size="sm">
            sharperatio:{' '}
            <Text span ff="monospace">
              {formatMetricNumber(sa.sharperatio, 4)}
            </Text>
          </Text>
          <Text size="sm">
            vs trimmed Sharpe:{' '}
            <Text span ff="monospace">
              {formatMetricNumber(metrics.sharpe_ratio, 4)}
            </Text>
          </Text>
        </Stack>
      </SimpleGrid>
    </Paper>
  )
}

const STACK_PALETTE = [
  '#f59e0b',
  '#3b82f6',
  '#10b981',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
  '#f97316',
  '#6366f1',
  '#14b8a6',
]

export default function BacktestResultCharts({ data }: { data: BacktestResultPayload }) {
  const theme = useMantineTheme()
  const { colorScheme } = useMantineColorScheme()
  const tableProps = useMantineTableDensity()

  const muted =
    colorScheme === 'dark' ? theme.colors.dark[2] : theme.colors.gray[6]
  const gridStroke =
    colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[3]
  const panelBg =
    colorScheme === 'dark' ? theme.other.darkPanelBg : theme.white
  const borderColor =
    colorScheme === 'dark' ? theme.other.darkBorder : theme.colors.gray[4]
  const textColor =
    colorScheme === 'dark' ? theme.colors.dark[0] : theme.colors.dark[9]
  const accent =
    theme.colors.yellow[colorScheme === 'dark' ? 5 : 6] ?? theme.colors.yellow[6]
  const turnoverBar =
    colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[3]
  const turnoverBarStroke =
    colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[5]
  const turnoverLine =
    colorScheme === 'dark' ? theme.colors.dark[3] : theme.colors.gray[7]

  const chartAxisStyle = useMemo(
    (): AxisTick => ({
      fontSize: 11,
      fill: muted,
      fontVariantNumeric: 'tabular-nums',
    }),
    [muted],
  )

  const tooltipStyle = useMemo(
    (): CSSProperties => ({
      background: panelBg,
      border: `1px solid ${borderColor}`,
      borderRadius: theme.defaultRadius,
      color: textColor,
      fontSize: '0.8125rem',
    }),
    [borderColor, panelBg, textColor, theme.defaultRadius],
  )

  const ddStroke = theme.colors.red[6]!
  const ddFill =
    colorScheme === 'dark' ? theme.colors.red[9]! : theme.colors.red[1]!

  const equityPts = useMemo(() => adaptEquityCurve(data.equity_curve), [data.equity_curve])
  const turnoverPts = useMemo(
    () => adaptTurnoverHistory(data.turnover_history, data.equity_curve),
    [data.turnover_history, data.equity_curve],
  )

  const targetHist = useMemo(() => {
    const th = data.target_history
    return Array.isArray(th) ? th : []
  }, [data.target_history])

  const targetStack = useMemo(
    () => adaptTargetHistoryStacked(targetHist, 10),
    [targetHist],
  )

  const concPts = useMemo(() => targetHistoryConcentration(targetHist), [targetHist])

  const periodsPerYear = useMemo(
    () => periodsPerYearFromMetrics(data.metrics),
    [data.metrics],
  )

  const barReturns = useMemo(() => equityBarReturns(equityPts), [equityPts])
  const histBins = useMemo(() => returnHistogramBins(barReturns, 20), [barReturns])

  const rollWindow = useMemo(() => {
    const n = barReturns.length
    if (n < 12) return 5
    return Math.min(63, Math.max(8, Math.floor(n / 6)))
  }, [barReturns.length])

  const rollSharpe = useMemo(
    () => rollingSharpeFromEquity(equityPts, rollWindow, periodsPerYear),
    [equityPts, rollWindow, periodsPerYear],
  )

  const xDomain = useMemo((): [number, number] | null => {
    if (equityPts.length === 0) return null
    return [equityPts[0]!.t, equityPts[equityPts.length - 1]!.t]
  }, [equityPts])

  const m = data.metrics
  const hasBenchmark = data.benchmark != null && typeof data.benchmark === 'object'
  const showBenchTurnover = hasBenchmark || turnoverPts.length > 0
  const hasAnalyzerPayload =
    data.drawdown_analysis != null ||
    data.returns_analysis != null ||
    data.sharpe_analysis != null

  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
        <Paper withBorder p="sm" radius="md">
          <Text size="xs" c="dimmed">
            CAGR
          </Text>
          <Text fw={700}>{pctLabel(m.cagr_pct, 2)}</Text>
        </Paper>
        <Paper withBorder p="sm" radius="md">
          <Text size="xs" c="dimmed">
            Sharpe
          </Text>
          <Text fw={700}>{formatMetricNumber(m.sharpe_ratio, 3)}</Text>
        </Paper>
        <Paper withBorder p="sm" radius="md">
          <Text size="xs" c="dimmed">
            Max drawdown
          </Text>
          <Text fw={700}>{pctLabel(m.max_drawdown_pct, 2)}</Text>
        </Paper>
        <Paper withBorder p="sm" radius="md">
          <Text size="xs" c="dimmed">
            Win rate
          </Text>
          <Text fw={700}>{pctLabel(m.win_rate_pct, 1)}</Text>
        </Paper>
        <Paper withBorder p="sm" radius="md">
          <Text size="xs" c="dimmed">
            Total return
          </Text>
          <Text fw={700}>{pctLabel(m.total_return_pct, 2)}</Text>
        </Paper>
        <Paper withBorder p="sm" radius="md">
          <Text size="xs" c="dimmed">
            Avg turnover % / rebalance
          </Text>
          <Text fw={700}>{pctLabel(m.avg_turnover_pct, 2)}</Text>
        </Paper>
        <Paper withBorder p="sm" radius="md">
          <Text size="xs" c="dimmed">
            Rebalances
          </Text>
          <Text fw={700}>{formatMetricNumber(m.rebalance_count, 0)}</Text>
        </Paper>
        <Paper withBorder p="sm" radius="md">
          <Text size="xs" c="dimmed">
            Top name gross %
          </Text>
          <Text fw={700}>{pctLabel(m.top_name_gross_share_pct, 1)}</Text>
        </Paper>
        {m.max_group_gross_share_pct != null && (
          <Paper withBorder p="sm" radius="md">
            <Text size="xs" c="dimmed">
              Max group gross %
            </Text>
            <Text fw={700}>{pctLabel(m.max_group_gross_share_pct, 1)}</Text>
          </Paper>
        )}
        {m.max_group_net_share_pct != null && (
          <Paper withBorder p="sm" radius="md">
            <Text size="xs" c="dimmed">
              Max group net %
            </Text>
            <Text fw={700}>{pctLabel(m.max_group_net_share_pct, 1)}</Text>
          </Paper>
        )}
      </SimpleGrid>

      {equityPts.length > 0 && xDomain && (
        <Paper withBorder p="md" radius="md">
          <Title order={4} size="h5" mb="sm">
            Performance
          </Title>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={equityPts} margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
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
                  stroke={accent}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ width: '100%', height: 160, marginTop: '0.25rem' }}>
            <ResponsiveContainer>
              <DrawdownAreaChart
                points={equityPts}
                xDomain={xDomain}
                axis={chartAxisStyle}
                gridStroke={gridStroke}
                tooltip={tooltipStyle}
                drawdownStroke={ddStroke}
                drawdownFill={ddFill}
              />
            </ResponsiveContainer>
          </div>
        </Paper>
      )}

      {equityPts.length > 0 && <MonthlyReturnsHeatmap equityCurve={data.equity_curve} />}

      {histBins.some((b) => b.count > 0) && (
        <Paper withBorder p="md" radius="md">
          <Title order={4} size="h5" mb="sm">
            Bar return distribution
          </Title>
          <Text size="xs" c="dimmed" mb="sm">
            Histogram of equity step returns (same cadence as bar spec).
          </Text>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={histBins} margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={chartAxisStyle} interval={2} angle={-35} textAnchor="end" height={60} />
                <YAxis tick={chartAxisStyle} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" name="Count" fill={turnoverBar} stroke={turnoverBarStroke} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Paper>
      )}

      {rollSharpe.length > 0 && (
        <Paper withBorder p="md" radius="md">
          <Title order={4} size="h5" mb="sm">
            Rolling Sharpe ({rollWindow} bars)
          </Title>
          <Text size="xs" c="dimmed" mb="sm">
            Annualized from rolling mean / std of bar returns; window sized to sample length.
          </Text>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={rollSharpe} margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="t"
                  tickFormatter={tickDate}
                  tick={chartAxisStyle}
                  scale="time"
                />
                <YAxis tick={chartAxisStyle} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(ms) => (typeof ms === 'number' ? new Date(ms).toLocaleString() : '')}
                />
                <Line
                  type="monotone"
                  dataKey="sharpe"
                  name="Sharpe"
                  stroke={accent}
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Paper>
      )}

      {targetStack.keys.length > 0 && targetStack.series.length > 0 && (
        <Paper withBorder p="md" radius="md">
          <Title order={4} size="h5" mb="sm">
            Target weights (top 10 + Other)
          </Title>
          <Text size="xs" c="dimmed" mb="sm">
            Stacked notionals from strategy output per rebalance (Yahoo / FinStrat convention).
          </Text>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <AreaChart data={targetStack.series} margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="t"
                  tickFormatter={tickDate}
                  tick={chartAxisStyle}
                  scale="time"
                />
                <YAxis tick={chartAxisStyle} tickFormatter={(v) => `${(Number(v) * 100).toFixed(0)}%`} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={(ms) => String(ms)} />
                <Legend />
                {targetStack.keys.map((k, i) => (
                  <Area
                    key={k}
                    type="stepAfter"
                    dataKey={k}
                    name={k}
                    stackId="w"
                    stroke={STACK_PALETTE[i % STACK_PALETTE.length]}
                    fill={STACK_PALETTE[i % STACK_PALETTE.length]}
                    fillOpacity={0.65}
                    isAnimationActive={false}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Paper>
      )}

      {concPts.length > 0 && (
        <Paper withBorder p="md" radius="md">
          <Title order={4} size="h5" mb="sm">
            Concentration (HHI and max |weight|)
          </Title>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={concPts} margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="t"
                  tickFormatter={tickDate}
                  tick={chartAxisStyle}
                  scale="time"
                />
                <YAxis tick={chartAxisStyle} domain={[0, 1]} tickFormatter={(v) => v.toFixed(2)} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(ms) => (typeof ms === 'number' ? tickDate(ms) : String(ms))}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="hhi"
                  name="HHI"
                  stroke={theme.colors.blue[6]}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="maxAbs"
                  name="Max |w|"
                  stroke={theme.colors.cyan[6]}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Paper>
      )}

      {data.group_exposure_history && data.group_exposure_history.length > 0 && (
        <GroupExposureLatestTable rows={data.group_exposure_history} tableProps={tableProps} />
      )}

      {showBenchTurnover && (
        <Paper withBorder p="md" radius="md">
          <Title order={4} size="h5" mb="md">
            Benchmark and turnover
          </Title>
          <Stack gap="lg">
            {hasBenchmark && <BenchmarkPanel benchmark={data.benchmark as Record<string, unknown>} />}
            {turnoverPts.length > 0 && (
              <Stack gap="xs">
                <Title order={5} size="sm">
                  Turnover (USD per rebalance; % of equity)
                </Title>
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <ComposedChart data={turnoverPts} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                      <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
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
                          fill: muted,
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
                          fill: muted,
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
                        fill={turnoverBar}
                        stroke={turnoverBarStroke}
                        radius={[2, 2, 0, 0]}
                        isAnimationActive={false}
                      />
                      <Line
                        yAxisId="pct"
                        type="monotone"
                        dataKey="turnoverPct"
                        name="Turnover % equity"
                        stroke={turnoverLine}
                        strokeWidth={1.5}
                        dot={false}
                        connectNulls
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </Stack>
            )}
          </Stack>
        </Paper>
      )}

      {hasAnalyzerPayload && (
        <AnalyzerSummaryCard
          metrics={m}
          drawdownAnalysis={data.drawdown_analysis}
          returnsAnalysis={data.returns_analysis}
          sharpeAnalysis={data.sharpe_analysis}
        />
      )}

      {equityPts.length === 0 && turnoverPts.length === 0 && targetStack.series.length === 0 && (
        <Text c="dimmed" size="sm">
          No equity, turnover, or target series to chart.
        </Text>
      )}
    </Stack>
  )
}
