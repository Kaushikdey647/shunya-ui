import {
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  useMantineColorScheme,
  useMantineTheme,
} from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { Line, LineChart, ResponsiveContainer } from 'recharts'
import { postMarketSnapshot } from '../../api/endpoints'
import type { MarketSnapshotRow } from '../../api/types'
import ApiErrorAlert from '../ApiErrorAlert'
import { MACRO_STRIP_SYMBOLS } from '../../lib/macroSymbols'
import { SignedPctText } from '../../lib/signedPct'

function MacroCard({ row }: { row: MarketSnapshotRow }) {
  const theme = useMantineTheme()
  const { colorScheme } = useMantineColorScheme()
  const data = row.sparkline_close.map((close, i) => ({ i, close }))
  const pct = row.pct_change_1d
  const last = row.last
  const stroke =
    colorScheme === 'dark' ? theme.colors.dark[2] : theme.colors.gray[6]

  return (
    <Card padding="sm" radius="md" withBorder>
      <Card.Section inheritPadding pb="xs">
        <Text fw={600} ff="monospace" size="sm">
          {row.symbol}
        </Text>
        <Group justify="space-between" gap="xs" wrap="nowrap">
          <Text ff="monospace" size="sm" fw={500}>
            {last != null && Number.isFinite(last)
              ? last.toLocaleString(undefined, { maximumFractionDigits: 2 })
              : '—'}
          </Text>
          <SignedPctText v={pct} />
        </Group>
      </Card.Section>
      <div style={{ height: 52 }}>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={52}>
            <LineChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <Line
                type="monotone"
                dataKey="close"
                stroke={stroke}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <Text size="xs" c="dimmed" pt="sm">
            No series
          </Text>
        )}
      </div>
    </Card>
  )
}

export default function MacroStrip() {
  const symbols = [...MACRO_STRIP_SYMBOLS]
  const q = useQuery({
    queryKey: ['market', 'snapshot', 'macro', symbols.join(',')],
    queryFn: () => postMarketSnapshot({ symbols }),
    staleTime: 90_000,
  })

  const bySym = new Map((q.data?.rows ?? []).map((r) => [r.symbol, r]))

  return (
    <Stack gap="sm" aria-label="Macro overview">
      <ApiErrorAlert error={q.error} />
      {q.isLoading && (
        <Text c="dimmed" size="sm">
          Loading macro…
        </Text>
      )}
      {!q.isLoading && (
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
          {symbols.map((sym) => {
            const row =
              bySym.get(sym) ??
              ({
                symbol: sym,
                last: null,
                pct_change_1d: null,
                volume: null,
                sparkline_close: [],
              } satisfies MarketSnapshotRow)
            return <MacroCard key={sym} row={row} />
          })}
        </SimpleGrid>
      )}
    </Stack>
  )
}
