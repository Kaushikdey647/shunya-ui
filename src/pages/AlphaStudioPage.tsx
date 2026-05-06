import {
  Alert,
  Anchor,
  Button,
  Checkbox,
  Code,
  Group,
  NumberInput,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Outlet, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  createAlpha,
  deleteAlpha,
  getAlpha,
  getBacktest,
  getBacktestLogs,
  getBacktestResult,
  listAlphas,
  patchAlpha,
} from '../api/endpoints'
import type { BacktestJobOut, FinStratConfig } from '../api/types'
import { ApiError } from '../api/client'
import { DEFAULT_ALPHA_SOURCE } from '../alphaEditor/defaults'
import { defaultFinStratConfig } from '../api/defaultConfigs'
import ApiErrorAlert from '../components/ApiErrorAlert'
import AlphaSourceEditor from '../components/AlphaSourceEditor'
import BacktestConfigPanel from '../components/BacktestConfigPanel'
import BacktestResultCharts from '../components/BacktestResultCharts'
import FinStratConfigForm from '../components/FinStratConfigForm'
import PageScaffold from '../components/PageScaffold'
import { useMantineTableDensity } from '../hooks/useMantineTableDensity'
import {
  alphaDetailsSchema,
  finstratFromServer,
  type AlphaDetailsFormValues,
} from './alphaStudioForms'
import { z } from 'zod'

const BT_FORM_ID = 'studio-backtest-config-form'

type RailTab = 'details' | 'strategy' | 'config' | 'console' | 'results'

export default function AlphaStudioLayout() {
  return <Outlet />
}

export function StudioAlphaHub() {
  const density = useMantineTableDensity()
  const navigate = useNavigate()
  const [limit, setLimit] = useState(100)
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const qc = useQueryClient()

  const q = useQuery({
    queryKey: ['alphas', limit, offset],
    queryFn: () => listAlphas({ limit, offset }),
  })

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- selection is page-scoped; clear when paging changes
    setSelected(new Set())
  }, [limit, offset])

  const rows = useMemo(() => q.data ?? [], [q.data])

  const pageIds = useMemo(() => rows.map((a) => a.id), [rows])
  const allOnPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const someOnPageSelected = pageIds.some((id) => selected.has(id))

  const delMut = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await deleteAlpha(id)
      }
    },
    onSuccess: (_, ids) => {
      void qc.invalidateQueries({ queryKey: ['alphas'] })
      void qc.invalidateQueries({ queryKey: ['backtests'] })
      setSelected((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      })
    },
  })

  const toggleAllOnPage = () => {
    if (!rows.length) return
    const ids = rows.map((a) => a.id)
    const allSelected = ids.every((id) => selected.has(id))
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.add(id))
        return next
      })
    }
  }

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const confirmDeleteAlphas = (ids: string[], label: string) => {
    if (
      !window.confirm(
        `Delete ${ids.length} alpha(s): ${label}? This also removes all backtest jobs for each alpha.`,
      )
    ) {
      return
    }
    delMut.mutate(ids)
  }

  return (
    <PageScaffold>
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <Title order={1}>Alpha Studio</Title>
        <Button color="yellow" onClick={() => navigate('/studio/new')}>
          New alpha
        </Button>
      </Group>
      <Text c="dimmed" size="sm">
        Select an alpha to open the unified workspace (metadata, strategy, source, backtest, console,
        results).
      </Text>

      <Group align="flex-end" wrap="wrap">
        <NumberInput
          label="Limit"
          min={1}
          max={500}
          value={limit}
          onChange={(v) => {
            setLimit(typeof v === 'number' && v > 0 ? v : 100)
            setOffset(0)
          }}
          w={100}
        />
        <NumberInput
          label="Offset"
          min={0}
          value={offset}
          onChange={(v) => setOffset(typeof v === 'number' && v >= 0 ? v : 0)}
          w={100}
        />
        <Button variant="default" disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - limit))}>
          Previous page
        </Button>
        <Button
          variant="default"
          disabled={!q.data || q.data.length < limit}
          onClick={() => setOffset((o) => o + limit)}
        >
          Next page
        </Button>
      </Group>

      {selected.size > 0 && (
        <Group align="center" wrap="wrap" gap="sm">
          <Text c="dimmed" size="sm">
            {selected.size} selected
          </Text>
          <Button
            color="red"
            variant="light"
            disabled={delMut.isPending}
            onClick={() => {
              const ids = rows.filter((a) => selected.has(a.id)).map((a) => a.id)
              if (ids.length === 0) return
              const label = rows
                .filter((a) => selected.has(a.id))
                .map((a) => a.name)
                .join(', ')
              confirmDeleteAlphas(ids, label)
            }}
          >
            Delete selected
          </Button>
        </Group>
      )}

      <ApiErrorAlert error={q.error} />
      <ApiErrorAlert error={delMut.error} />
      {q.isLoading && (
        <Text c="dimmed" size="sm">
          Loading…
        </Text>
      )}

      {q.data && (
        <Stack gap="sm">
          <Table.ScrollContainer minWidth={640}>
            <Table {...density} striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w="2.5rem">
                    <Checkbox
                      aria-label="Select all on this page"
                      checked={allOnPageSelected}
                      indeterminate={someOnPageSelected && !allOnPageSelected}
                      disabled={rows.length === 0 || delMut.isPending}
                      onChange={toggleAllOnPage}
                    />
                  </Table.Th>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>ID</Table.Th>
                  <Table.Th>Import ref</Table.Th>
                  <Table.Th>Updated</Table.Th>
                  <Table.Th w="6rem" />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((a) => (
                  <Table.Tr key={a.id}>
                    <Table.Td>
                      <Checkbox
                        checked={selected.has(a.id)}
                        disabled={delMut.isPending}
                        aria-label={`Select ${a.name}`}
                        onChange={() => toggleOne(a.id)}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Anchor component={Link} to={`/studio/${encodeURIComponent(a.id)}`}>
                        {a.name}
                      </Anchor>
                    </Table.Td>
                    <Table.Td ff="monospace">{a.id}</Table.Td>
                    <Table.Td ff="monospace">{a.import_ref}</Table.Td>
                    <Table.Td>{new Date(a.updated_at).toLocaleString()}</Table.Td>
                    <Table.Td>
                      <Button
                        color="red"
                        variant="light"
                        size="compact-sm"
                        disabled={delMut.isPending}
                        onClick={() => confirmDeleteAlphas([a.id], a.name)}
                      >
                        Delete
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          {q.data.length === 0 && (
            <Text c="dimmed" size="sm">
              No alphas.
            </Text>
          )}
        </Stack>
      )}
    </PageScaffold>
  )
}

const createAlphaFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Required')
    .max(128)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Alphanumeric, underscore, hyphen only'),
  description: z.string().max(2048).optional(),
})

type CreateAlphaFormValues = z.infer<typeof createAlphaFormSchema>

export function StudioAlphaCreate() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [code, setCode] = useState(DEFAULT_ALPHA_SOURCE)
  const [finstratDraft, setFinstratDraft] = useState<FinStratConfig>(defaultFinStratConfig)

  const form = useForm<CreateAlphaFormValues>({
    resolver: zodResolver(createAlphaFormSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  })

  const mutation = useMutation({
    mutationFn: (values: CreateAlphaFormValues) => {
      const sc = code.trim() === '' ? null : code
      if (sc == null) {
        return Promise.reject(
          new Error('Add non-empty alpha source code, or use an existing example from the list.'),
        )
      }
      return createAlpha({
        name: values.name,
        description: values.description || undefined,
        import_ref: null,
        source_code: sc,
        finstrat_config: finstratDraft,
      })
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ['alphas'] })
      navigate(`/studio/${encodeURIComponent(row.id)}`, { replace: true })
    },
  })

  return (
    <PageScaffold>
      <Button component={Link} to="/studio" variant="default">
        ← Studio
      </Button>
      <Title order={1}>New alpha</Title>

      <ApiErrorAlert error={mutation.error} />
      {mutation.error instanceof Error && !('status' in (mutation.error as object)) && (
        <Alert color="red" variant="light">
          {mutation.error.message}
        </Alert>
      )}
      {mutation.error instanceof ApiError && mutation.error.status === 409 && (
        <Text c="dimmed" size="sm">
          Choose a different name (duplicate).
        </Text>
      )}

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <Stack gap="md">
          <Title order={2} size="h4">
            Alpha source (Python + JAX)
          </Title>
          <Text c="dimmed" size="sm">
            Define a top-level <Code>alpha(ctx)</Code> function. After creation you can edit metadata and
            strategy in Studio.
          </Text>
          <AlphaSourceEditor value={code} onChange={setCode} height="52vh" />
        </Stack>

        <Stack gap="md">
          <Title order={2} size="h4">
            Details
          </Title>
          <Stack component="form" gap="sm" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
            <TextInput label="Name" autoComplete="off" {...form.register('name')} error={form.formState.errors.name?.message} />
            <TextInput label="Description (optional)" {...form.register('description')} />
            <Title order={3} size="h5" mt="sm">
              Strategy config
            </Title>
            <Text c="dimmed" size="xs">
              Adjust below, then create — values are sent with the request.
            </Text>
          </Stack>
          <FinStratConfigForm
            resetKey="new"
            config={defaultFinStratConfig}
            onValidChange={setFinstratDraft}
            isPending={false}
            submitLabel="Apply strategy to draft (optional)"
            onSubmit={setFinstratDraft}
          />
          <Button
            color="yellow"
            disabled={mutation.isPending}
            onClick={() => form.handleSubmit((v) => mutation.mutate(v))()}
          >
            {mutation.isPending ? 'Creating…' : 'Create alpha'}
          </Button>
        </Stack>
      </SimpleGrid>
    </PageScaffold>
  )
}

function syntheticConsoleLines(job: BacktestJobOut | undefined): string[] {
  if (!job) return []
  const lines: string[] = []
  lines.push(`[${job.status}] job ${job.id.slice(0, 8)}…`)
  lines.push(`created ${new Date(job.created_at).toLocaleString()}`)
  if (job.started_at) lines.push(`started ${new Date(job.started_at).toLocaleString()}`)
  if (job.finished_at) lines.push(`finished ${new Date(job.finished_at).toLocaleString()}`)
  if (job.error_message) lines.push(`error:\n${job.error_message}`)
  if (job.result_summary && typeof job.result_summary === 'object') {
    lines.push(`summary: ${JSON.stringify(job.result_summary)}`)
  }
  return lines
}

export function AlphaStudioWorkspace() {
  const { alphaId } = useParams<{ alphaId: string }>()
  if (!alphaId) {
    return (
      <PageScaffold>
        <Text c="dimmed">Missing alpha id.</Text>
        <Button component={Link} to="/studio" variant="default">
          ← Studio
        </Button>
      </PageScaffold>
    )
  }
  return <AlphaStudioWorkspaceInner alphaId={alphaId} />
}

function AlphaStudioWorkspaceInner({ alphaId }: { alphaId: string }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const [code, setCode] = useState('')
  const [railTab, setRailTab] = useState<RailTab>('details')
  const activeJobId = searchParams.get('job')

  const alphaQ = useQuery({
    queryKey: ['alpha', alphaId],
    queryFn: () => getAlpha(alphaId),
    enabled: Boolean(alphaId),
  })

  const detailsForm = useForm<AlphaDetailsFormValues>({
    resolver: zodResolver(alphaDetailsSchema),
    defaultValues: {},
  })

  useEffect(() => {
    if (!alphaQ.data) return
    detailsForm.reset({
      name: alphaQ.data.name,
      description: alphaQ.data.description ?? '',
    })
    // eslint-disable-next-line react-hooks/set-state-in-effect -- controlled editor reset from API
    setCode(
      alphaQ.data.source_code != null && alphaQ.data.source_code.trim() !== ''
        ? alphaQ.data.source_code
        : DEFAULT_ALPHA_SOURCE,
    )
  }, [alphaQ.data, detailsForm])

  const detailsMut = useMutation({
    mutationFn: (body: { name?: string; description?: string | null }) =>
      patchAlpha(alphaId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['alpha', alphaId] })
      void qc.invalidateQueries({ queryKey: ['alphas'] })
    },
  })

  const codeMut = useMutation({
    mutationFn: (source_code: string) =>
      patchAlpha(alphaId, { source_code: source_code.trim() === '' ? null : source_code }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['alpha', alphaId] })
      void qc.invalidateQueries({ queryKey: ['alphas'] })
    },
  })

  const finstratMut = useMutation({
    mutationFn: (finstrat_config: FinStratConfig) => patchAlpha(alphaId, { finstrat_config }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['alpha', alphaId] })
      void qc.invalidateQueries({ queryKey: ['alphas'] })
    },
  })

  const delMut = useMutation({
    mutationFn: () => deleteAlpha(alphaId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['alphas'] })
      navigate('/studio')
    },
  })

  const jobQ = useQuery({
    queryKey: ['backtest', activeJobId],
    queryFn: () => getBacktest(activeJobId!),
    enabled: Boolean(activeJobId),
    refetchInterval: (query) => {
      const s = query.state.data?.status
      return s === 'queued' || s === 'running' ? 2000 : false
    },
  })

  const logsQ = useQuery({
    queryKey: ['backtest-logs', activeJobId],
    queryFn: () => getBacktestLogs(activeJobId!),
    enabled: Boolean(activeJobId),
    refetchInterval: () => {
      const st = qc.getQueryData<BacktestJobOut>(['backtest', activeJobId])?.status
      return st === 'queued' || st === 'running' ? 2500 : false
    },
  })

  const resultQ = useQuery({
    queryKey: ['backtest-result', activeJobId],
    queryFn: () => getBacktestResult(activeJobId!),
    enabled: jobQ.data?.status === 'succeeded',
  })

  const prevStatus = useRef<string | null>(null)
  useEffect(() => {
    const s = jobQ.data?.status ?? null
    if (s === 'succeeded' && prevStatus.current !== 'succeeded') {
      setRailTab('results')
    }
    prevStatus.current = s
  }, [jobQ.data?.status])

  const onEnqueueSuccess = (job: BacktestJobOut) => {
    setSearchParams({ job: job.id }, { replace: true })
    setRailTab('console')
    void qc.invalidateQueries({ queryKey: ['backtests'] })
  }

  const job = jobQ.data
  const synth = syntheticConsoleLines(job)
  const remoteLogs = logsQ.data ?? []
  const consoleText =
    remoteLogs.length > 0
      ? [...remoteLogs.map((l) => `[${l.ts}] ${l.message}`), '', '--- poll snapshot ---', ...synth].join(
          '\n',
        )
      : synth.join('\n')

  return (
    <PageScaffold size="xl">
      <Button component={Link} to="/studio" variant="default">
        ← Studio
      </Button>

      <ApiErrorAlert error={alphaQ.error} />
      {alphaQ.isLoading && (
        <Text c="dimmed" size="sm">
          Loading alpha…
        </Text>
      )}
      {!alphaQ.isLoading && !alphaQ.data && (
        <Text c="dimmed" size="sm">
          Alpha not found.
        </Text>
      )}

      {alphaQ.data && (
        <Stack gap="lg">
          <div>
            <Title order={1}>{alphaQ.data.name}</Title>
            <Text ff="monospace" c="dimmed" size="xs" style={{ fontVariantNumeric: 'tabular-nums' }}>
              Studio · {alphaQ.data.id}
            </Text>
          </div>

          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            <Stack gap="sm">
              <Title order={2} size="h4">
                Alpha source
              </Title>
              <ApiErrorAlert error={codeMut.error} />
              <AlphaSourceEditor value={code} onChange={setCode} height="52vh" />
              <Button color="yellow" disabled={codeMut.isPending} onClick={() => codeMut.mutate(code)}>
                {codeMut.isPending ? 'Saving…' : 'Save code'}
              </Button>
            </Stack>

            <Paper withBorder p="md" radius="md">
              <Tabs value={railTab} onChange={(v) => v && setRailTab(v as RailTab)}>
                <Tabs.List grow>
                  <Tabs.Tab value="details">Details</Tabs.Tab>
                  <Tabs.Tab value="strategy">Strategy</Tabs.Tab>
                  <Tabs.Tab value="config">Backtest</Tabs.Tab>
                  <Tabs.Tab value="console">Console</Tabs.Tab>
                  <Tabs.Tab value="results">Results</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="details" pt="md">
                  <Stack gap="md">
                    <Title order={3} size="h5">
                      Metadata
                    </Title>
                    <ApiErrorAlert error={detailsMut.error} />
                    <Stack
                      component="form"
                      gap="sm"
                      onSubmit={detailsForm.handleSubmit((v) => {
                        if (!alphaQ.data) return
                        const body: { name?: string; description?: string | null } = {}
                        if (v.name != null && v.name !== alphaQ.data.name) body.name = v.name
                        const desc = v.description === '' ? null : v.description
                        if (desc !== (alphaQ.data.description ?? null)) body.description = desc
                        if (Object.keys(body).length === 0) return
                        detailsMut.mutate(body)
                      })}
                    >
                      <TextInput label="Name" {...detailsForm.register('name')} />
                      <TextInput label="Description" {...detailsForm.register('description')} />
                      {alphaQ.data.import_ref && (
                        <TextInput
                          label="Module import (read-only; overridden when inline source is saved)"
                          readOnly
                          ff="monospace"
                          value={alphaQ.data.import_ref}
                          onChange={() => {}}
                        />
                      )}
                      {detailsForm.formState.errors.name && (
                        <Text size="sm" c="red">
                          {detailsForm.formState.errors.name.message}
                        </Text>
                      )}
                      <Button type="submit" variant="default" disabled={detailsMut.isPending}>
                        {detailsMut.isPending ? 'Saving…' : 'Save metadata'}
                      </Button>
                    </Stack>

                    <Title order={3} size="h5">
                      Delete alpha
                    </Title>
                    <ApiErrorAlert error={delMut.error} />
                    {delMut.error instanceof ApiError && delMut.error.status === 409 && (
                      <Text c="dimmed" size="sm">
                        Cannot delete while backtest jobs reference this alpha.
                      </Text>
                    )}
                    <Button
                      color="red"
                      variant="light"
                      disabled={delMut.isPending}
                      onClick={() => {
                        if (
                          window.confirm(
                            'Delete this alpha? This cannot be undone if the server allows it.',
                          )
                        ) {
                          delMut.mutate()
                        }
                      }}
                    >
                      {delMut.isPending ? 'Deleting…' : 'Delete alpha'}
                    </Button>
                  </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="strategy" pt="md">
                  <ApiErrorAlert error={finstratMut.error} />
                  <FinStratConfigForm
                    config={finstratFromServer(alphaQ.data.finstrat_config)}
                    resetKey={alphaQ.data.updated_at}
                    isPending={finstratMut.isPending}
                    submitLabel="Update strategy config"
                    onSubmit={(c) => finstratMut.mutate(c)}
                  />
                </Tabs.Panel>

                <Tabs.Panel value="config" pt="md">
                  <BacktestConfigPanel
                    alphaId={alphaId}
                    formId={BT_FORM_ID}
                    hideInlineSubmit
                    onEnqueueSuccess={onEnqueueSuccess}
                  />
                </Tabs.Panel>

                <Tabs.Panel value="console" pt="md">
                  <Stack gap="sm">
                    <Text c="dimmed" size="xs">
                      Live worker lines refresh while the job runs; status lines always reflect the latest
                      poll.
                    </Text>
                    <ScrollArea h={360}>
                      <Code block ff="monospace" fz="xs" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {consoleText}
                      </Code>
                    </ScrollArea>
                    <ApiErrorAlert error={logsQ.error} />
                  </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="results" pt="md">
                  <Stack gap="sm">
                    <ApiErrorAlert error={resultQ.error} />
                    {job?.status !== 'succeeded' && (
                      <Text c="dimmed" size="sm">
                        Run a backtest to completion to see the tearsheet.
                      </Text>
                    )}
                    {resultQ.data && <BacktestResultCharts data={resultQ.data} />}
                  </Stack>
                </Tabs.Panel>
              </Tabs>

              <Group mt="md" justify="flex-start" wrap="wrap">
                <Button type="submit" form={BT_FORM_ID} color="yellow">
                  Run backtest
                </Button>
                {activeJobId && (
                  <Button
                    component={Link}
                    variant="default"
                    to={`/backtests/${encodeURIComponent(activeJobId)}`}
                  >
                    Open job page
                  </Button>
                )}
              </Group>
            </Paper>
          </SimpleGrid>
        </Stack>
      )}
    </PageScaffold>
  )
}
