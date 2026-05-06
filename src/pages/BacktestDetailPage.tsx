import {
  Alert,
  Button,
  Checkbox,
  Code,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getBacktest, getBacktestResult } from '../api/endpoints'
import ApiErrorAlert from '../components/ApiErrorAlert'
import BacktestResultCharts from '../components/BacktestResultCharts'
import PageScaffold from '../components/PageScaffold'
import { useMantineTableDensity } from '../hooks/useMantineTableDensity'

const TABLE_PREVIEW = 100

function RowTable({ rows }: { rows: Record<string, unknown>[] }) {
  const density = useMantineTableDensity()
  const [expanded, setExpanded] = useState(false)
  const keys = useMemo(() => {
    const first = rows[0]
    if (!first || typeof first !== 'object') return [] as string[]
    return Object.keys(first)
  }, [rows])

  if (rows.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        No rows.
      </Text>
    )
  }

  const shown = expanded ? rows : rows.slice(0, TABLE_PREVIEW)

  return (
    <Stack gap="sm">
      <ScrollArea type="auto">
        <Table {...density} striped highlightOnHover style={{ minWidth: 480 }}>
          <Table.Thead>
            <Table.Tr>
              {keys.map((k) => (
                <Table.Th key={k}>{k}</Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {shown.map((row, i) => (
              <Table.Tr key={i}>
                {keys.map((k) => (
                  <Table.Td key={k} ff="monospace" style={{ whiteSpace: 'pre-wrap', maxWidth: 320 }}>
                    {formatCell(row[k])}
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
      {rows.length > TABLE_PREVIEW && (
        <Button variant="default" size="compact-sm" onClick={() => setExpanded((e) => !e)}>
          {expanded ? 'Show less' : `Show all (${rows.length} rows)`}
        </Button>
      )}
    </Stack>
  )
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : ''
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack gap={4}>
      <Text c="dimmed" size="xs">
        {label}
      </Text>
      <div>{children}</div>
    </Stack>
  )
}

export default function BacktestDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const density = useMantineTableDensity()
  const [rawJson, setRawJson] = useState(false)

  const jobQ = useQuery({
    queryKey: ['backtest', jobId],
    queryFn: () => getBacktest(jobId!),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const s = query.state.data?.status
      return s === 'queued' || s === 'running' ? 2000 : false
    },
  })

  const resultQ = useQuery({
    queryKey: ['backtest-result', jobId],
    queryFn: () => getBacktestResult(jobId!),
    enabled: jobQ.data?.status === 'succeeded',
  })

  if (!jobId) {
    return (
      <PageScaffold>
        <Text c="dimmed">Missing job id.</Text>
      </PageScaffold>
    )
  }

  return (
    <PageScaffold>
      <Button component={Link} to="/backtests" variant="default">
        ← Backtests
      </Button>

      <ApiErrorAlert error={jobQ.error} />
      {jobQ.isLoading && (
        <Text c="dimmed" size="sm">
          Loading job…
        </Text>
      )}

      {jobQ.data && (
        <>
          <Title order={1}>Backtest job</Title>
          <Text ff="monospace" c="dimmed" size="sm">
            id: {jobQ.data.id}
          </Text>

          <Paper withBorder p="md" radius="md">
            <Stack gap="md">
              <MetaRow label="Status">
                <Text fw={700}>{jobQ.data.status}</Text>
              </MetaRow>
              <MetaRow label="Alpha id">
                <Text ff="monospace">{jobQ.data.alpha_id}</Text>
              </MetaRow>
              {jobQ.data.alpha_name && (
                <MetaRow label="Alpha name">
                  <Text>{jobQ.data.alpha_name}</Text>
                </MetaRow>
              )}
              {jobQ.data.index_code && (
                <MetaRow label="Index">
                  <Text ff="monospace">{jobQ.data.index_code}</Text>
                </MetaRow>
              )}
              <MetaRow label="Include test period in results">
                <Text>
                  {jobQ.data.include_test_period_in_results ? 'Yes' : 'No (tune window only)'}
                </Text>
              </MetaRow>
              <MetaRow label="Created">
                <Text>{new Date(jobQ.data.created_at).toLocaleString()}</Text>
              </MetaRow>
              {jobQ.data.started_at && (
                <MetaRow label="Started">
                  <Text>{new Date(jobQ.data.started_at).toLocaleString()}</Text>
                </MetaRow>
              )}
              {jobQ.data.finished_at && (
                <MetaRow label="Finished">
                  <Text>{new Date(jobQ.data.finished_at).toLocaleString()}</Text>
                </MetaRow>
              )}
              {jobQ.data.error_message && (
                <MetaRow label="Error">
                  <Alert color="red" variant="light">
                    <ScrollArea h={320}>
                      <Code block ff="monospace" fz="xs">
                        {jobQ.data.error_message}
                      </Code>
                    </ScrollArea>
                  </Alert>
                </MetaRow>
              )}
              {jobQ.data.result_summary && (
                <MetaRow label="Result summary">
                  <Code block ff="monospace" fz="xs">
                    {JSON.stringify(jobQ.data.result_summary, null, 2)}
                  </Code>
                </MetaRow>
              )}
            </Stack>
          </Paper>

          {jobQ.data.status === 'succeeded' && (
            <Stack gap="md">
              <Title order={2} size="h4">
                Result
              </Title>
              <Checkbox
                label="Show raw JSON"
                checked={rawJson}
                onChange={(e) => setRawJson(e.currentTarget.checked)}
              />
              <ApiErrorAlert error={resultQ.error} />
              {resultQ.isLoading && (
                <Text c="dimmed" size="sm">
                  Loading result…
                </Text>
              )}
              {resultQ.data && rawJson && (
                <Code block ff="monospace" fz="xs">
                  {JSON.stringify(resultQ.data, null, 2)}
                </Code>
              )}
              {resultQ.data && !rawJson && (
                <>
                  <Title order={3} size="h5">
                    Overview
                  </Title>
                  <Paper p="md" radius="md" withBorder>
                    <BacktestResultCharts data={resultQ.data} />
                  </Paper>
                  <Title order={3} size="h5">
                    Metrics
                  </Title>
                  <Table.ScrollContainer minWidth={400}>
                    <Table {...density} striped>
                      <Table.Tbody>
                        {Object.entries(resultQ.data.metrics).map(([k, v]) => (
                          <Table.Tr key={k}>
                            <Table.Th w="40%">{k}</Table.Th>
                            <Table.Td ff="monospace">{formatCell(v)}</Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Table.ScrollContainer>
                  <Title order={3} size="h5">
                    Equity curve (table)
                  </Title>
                  <RowTable rows={resultQ.data.equity_curve} />
                  <Title order={3} size="h5">
                    Turnover history (table)
                  </Title>
                  <RowTable rows={resultQ.data.turnover_history} />
                </>
              )}
            </Stack>
          )}
        </>
      )}
    </PageScaffold>
  )
}
