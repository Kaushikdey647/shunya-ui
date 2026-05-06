import {
  Alert,
  Anchor,
  Button,
  Group,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getInstrumentNews, getInstrumentOhlcv } from '../api/endpoints'
import ApiErrorAlert from '../components/ApiErrorAlert'
import InstrumentChart from '../components/InstrumentChart'
import InstrumentContextFeed from '../components/InstrumentContextFeed'
import PageScaffold from '../components/PageScaffold'
import { barTimesUtcSeconds, snapCrosshairToBarTime } from '../utils/chartBarTimes'

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
  const [focusBarUnix, setFocusBarUnix] = useState<number | null>(null)

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

  const newsRows = newsQuery.data?.news ?? []

  const barTimes = useMemo(
    () => barTimesUtcSeconds(ohlcv.data?.bars ?? []),
    [ohlcv.data?.bars],
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset crosshair-linked highlight when ticker changes
    setFocusBarUnix(null)
  }, [symbol])

  const onCrosshairBarUtc = useCallback(
    (utc: number | null) => {
      setFocusBarUnix(snapCrosshairToBarTime(utc, barTimes))
    },
    [barTimes],
  )

  if (!symbol) {
    return (
      <PageScaffold>
        <Title order={1}>Invalid symbol</Title>
        <Text c="dimmed" size="sm">
          Use a valid ticker (letters, numbers, . - ^).
        </Text>
        <Anchor component={Link} to="/search">
          Back to search
        </Anchor>
      </PageScaffold>
    )
  }

  const yahooUrl = `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`

  return (
    <PageScaffold>
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <Title order={1} ff="monospace">
          {symbol}
        </Title>
        <Group gap="md">
          <Anchor href={yahooUrl} target="_blank" rel="noopener noreferrer" size="sm">
            Yahoo Finance
          </Anchor>
          <Anchor component={Link} to={`/search?q=${encodeURIComponent(symbol)}`} size="sm">
            Search again
          </Anchor>
        </Group>
      </Group>

      <Button.Group>
        {TIMEFRAMES.map((p) => (
          <Button
            key={p.id}
            variant={p.id === preset.id ? 'filled' : 'default'}
            color={p.id === preset.id ? 'yellow' : undefined}
            size="compact-sm"
            onClick={() => {
              setPreset(p)
              setFocusBarUnix(null)
            }}
          >
            {p.label}
          </Button>
        ))}
      </Button.Group>

      {ohlcv.isLoading && (
        <Text c="dimmed" size="sm">
          Loading chart…
        </Text>
      )}
      <ApiErrorAlert error={ohlcv.error} />
      <ApiErrorAlert error={newsQuery.error} />
      {ohlcv.data?.storage_error && (
        <Alert color="red" variant="light">
          {ohlcv.data.storage_error}
        </Alert>
      )}
      {ohlcv.data?.storage_status === 'deferred' && ohlcv.data.storage_job_id != null && (
        <Text c="dimmed" size="sm">
          Database sync queued (job {ohlcv.data.storage_job_id}).
        </Text>
      )}
      {ohlcv.data && ohlcv.data.bars.length === 0 && !ohlcv.isLoading && (
        <Text c="dimmed" size="sm">
          No bars returned for this range.
        </Text>
      )}
      {ohlcv.data && ohlcv.data.bars.length > 0 && (
        <Group align="flex-start" gap="md" wrap="wrap" grow>
          <Stack style={{ flex: '2 1 420px', minWidth: 280 }}>
            <InstrumentChart
              bars={ohlcv.data.bars}
              news={newsRows}
              onCrosshairBarUtc={onCrosshairBarUtc}
              compactNewsTooltip
              key={`${preset.id}-${symbol}`}
            />
          </Stack>
          <Stack style={{ flex: '1 1 280px', minWidth: 260 }}>
            <InstrumentContextFeed
              news={newsRows}
              barTimes={barTimes}
              focusBarUnix={focusBarUnix}
            />
          </Stack>
        </Group>
      )}
    </PageScaffold>
  )
}
