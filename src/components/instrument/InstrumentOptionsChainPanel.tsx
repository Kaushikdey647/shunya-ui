import { Group, Select, Stack, Table, Text } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { getInstrumentOptionChain, getInstrumentOptionExpirations } from '../../api/endpoints'
import ApiErrorAlert from '../ApiErrorAlert'
import { useMantineTableDensity } from '../../hooks/useMantineTableDensity'

type Props = {
  symbol: string
  enabled: boolean
}

function LegTable({ title, rows }: { title: string; rows: { strike: number; last?: number | null; bid?: number | null; ask?: number | null; volume?: number | null; open_interest?: number | null; implied_volatility?: number | null }[] }) {
  const tableProps = useMantineTableDensity()
  if (rows.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No {title.toLowerCase()} rows.
      </Text>
    )
  }
  return (
    <Stack gap="xs">
      <Text fw={600} size="sm">
        {title}
      </Text>
      <Table.ScrollContainer minWidth={520}>
        <Table {...tableProps} striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Strike</Table.Th>
              <Table.Th>Last</Table.Th>
              <Table.Th>Bid</Table.Th>
              <Table.Th>Ask</Table.Th>
              <Table.Th>Volume</Table.Th>
              <Table.Th>OI</Table.Th>
              <Table.Th>IV</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((r, idx) => (
              <Table.Tr key={`${title}-${r.strike}-${idx}`}>
                <Table.Td ff="monospace">{r.strike}</Table.Td>
                <Table.Td ff="monospace">{r.last != null ? r.last.toFixed(2) : '—'}</Table.Td>
                <Table.Td ff="monospace">{r.bid != null ? r.bid.toFixed(2) : '—'}</Table.Td>
                <Table.Td ff="monospace">{r.ask != null ? r.ask.toFixed(2) : '—'}</Table.Td>
                <Table.Td ff="monospace">{r.volume ?? '—'}</Table.Td>
                <Table.Td ff="monospace">{r.open_interest ?? '—'}</Table.Td>
                <Table.Td ff="monospace">
                  {r.implied_volatility != null && Number.isFinite(r.implied_volatility)
                    ? (r.implied_volatility * 100).toFixed(1) + '%'
                    : '—'}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Stack>
  )
}

export default function InstrumentOptionsChainPanel({ symbol, enabled }: Props) {
  const [expiry, setExpiry] = useState<string | null>(null)

  const expQ = useQuery({
    queryKey: ['instrument-option-expirations', symbol],
    queryFn: () => getInstrumentOptionExpirations(symbol),
    enabled: enabled && symbol.length > 0,
    staleTime: 60_000,
  })

  useEffect(() => {
    const list = expQ.data?.expirations ?? []
    if (list.length === 0) {
      setExpiry(null)
      return
    }
    setExpiry((prev) => (prev && list.includes(prev) ? prev : list[0]!))
  }, [expQ.data?.expirations])

  const chainQ = useQuery({
    queryKey: ['instrument-option-chain', symbol, expiry],
    queryFn: () => getInstrumentOptionChain(symbol, expiry!),
    enabled: enabled && symbol.length > 0 && !!expiry,
    staleTime: 30_000,
  })

  return (
    <Stack gap="md">
      <ApiErrorAlert error={expQ.error} />
      <ApiErrorAlert error={chainQ.error} />
      {expQ.isLoading && (
        <Text size="sm" c="dimmed">
          Loading expirations…
        </Text>
      )}
      {expQ.data && !expQ.data.available && (
        <Text size="sm" c="dimmed">
          No option chain for this symbol.
        </Text>
      )}
      {expQ.data?.available && expQ.data.expirations.length > 0 && (
        <Group align="flex-end" wrap="wrap">
          <Select
            label="Expiry"
            data={expQ.data.expirations.map((e) => ({ value: e, label: e }))}
            value={expiry}
            onChange={setExpiry}
            searchable
            w={200}
          />
        </Group>
      )}
      {chainQ.isLoading && expiry && (
        <Text size="sm" c="dimmed">
          Loading chain…
        </Text>
      )}
      {chainQ.data && !chainQ.data.available && expiry && (
        <Text size="sm" c="dimmed">
          No quotes for this expiry.
        </Text>
      )}
      {chainQ.data?.available && (
        <Stack gap="xl">
          <LegTable title="Calls" rows={chainQ.data.calls} />
          <LegTable title="Puts" rows={chainQ.data.puts} />
        </Stack>
      )}
    </Stack>
  )
}
