import {
  Accordion,
  Group,
  Paper,
  SimpleGrid,
  Stack,
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

export default function BacktestResultCharts({ data }: { data: BacktestResultPayload }) {
  const theme = useMantineTheme()
  const { colorScheme } = useMantineColorScheme()

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

  const xDomain = useMemo((): [number, number] | null => {
    if (equityPts.length === 0) return null
    return [equityPts[0]!.t, equityPts[equityPts.length - 1]!.t]
  }, [equityPts])

  const m = data.metrics
  const hasBenchmark = data.benchmark != null && typeof data.benchmark === 'object'

  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
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

      {(hasBenchmark || turnoverPts.length > 0) && (
        <Accordion variant="contained">
          <Accordion.Item value="bench-turnover">
            <Accordion.Control>Benchmark &amp; turnover</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="md" mt="xs">
                {hasBenchmark && (
                  <BenchmarkPanel benchmark={data.benchmark as Record<string, unknown>} />
                )}
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
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      )}

      {equityPts.length === 0 && turnoverPts.length === 0 && (
        <Text c="dimmed" size="sm">
          No equity or turnover series to chart.
        </Text>
      )}
    </Stack>
  )
}
