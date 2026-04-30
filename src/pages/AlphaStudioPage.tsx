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
  const navigate = useNavigate()
  const [limit, setLimit] = useState(100)
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const headerCbRef = useRef<HTMLInputElement>(null)
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

  useEffect(() => {
    const el = headerCbRef.current
    if (el) {
      el.indeterminate = someOnPageSelected && !allOnPageSelected
    }
  }, [someOnPageSelected, allOnPageSelected])

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
    <div className="page-inner stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Alpha Studio</h1>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate('/studio/new')}
        >
          New alpha
        </button>
      </div>
      <p className="muted">
        Select an alpha to open the unified workspace (metadata, strategy, source, backtest, console,
        results).
      </p>

      <div className="row">
        <label>
          Limit{' '}
          <input
            type="number"
            min={1}
            max={500}
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value) || 100)
              setOffset(0)
            }}
            style={{ width: '5rem' }}
          />
        </label>
        <label>
          Offset{' '}
          <input
            type="number"
            min={0}
            value={offset}
            onChange={(e) => setOffset(Number(e.target.value) || 0)}
            style={{ width: '5rem' }}
          />
        </label>
        <button
          type="button"
          className="btn"
          disabled={offset === 0}
          onClick={() => setOffset((o) => Math.max(0, o - limit))}
        >
          Previous page
        </button>
        <button
          type="button"
          className="btn"
          disabled={!q.data || q.data.length < limit}
          onClick={() => setOffset((o) => o + limit)}
        >
          Next page
        </button>
      </div>

      {selected.size > 0 && (
        <div className="row" style={{ alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span className="muted">{selected.size} selected</span>
          <button
            type="button"
            className="btn btn-danger"
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
          </button>
        </div>
      )}

      <ApiErrorAlert error={q.error} />
      <ApiErrorAlert error={delMut.error} />
      {q.isLoading && <p className="muted">Loading…</p>}

      {q.data && (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th style={{ width: '2.5rem' }}>
                  <input
                    ref={headerCbRef}
                    type="checkbox"
                    aria-label="Select all on this page"
                    checked={allOnPageSelected}
                    disabled={rows.length === 0 || delMut.isPending}
                    onChange={toggleAllOnPage}
                  />
                </th>
                <th>Name</th>
                <th>ID</th>
                <th>Import ref</th>
                <th>Updated</th>
                <th style={{ width: '6rem' }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(a.id)}
                      disabled={delMut.isPending}
                      aria-label={`Select ${a.name}`}
                      onChange={() => toggleOne(a.id)}
                    />
                  </td>
                  <td>
                    <Link to={`/studio/${encodeURIComponent(a.id)}`}>{a.name}</Link>
                  </td>
                  <td className="mono">{a.id}</td>
                  <td className="mono">{a.import_ref}</td>
                  <td>{new Date(a.updated_at).toLocaleString()}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-danger"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                      disabled={delMut.isPending}
                      onClick={() => confirmDeleteAlphas([a.id], a.name)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {q.data.length === 0 && <p className="muted">No alphas.</p>}
        </div>
      )}
    </div>
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
    <div className="page-inner stack">
      <div className="row">
        <Link to="/studio" className="btn">
          ← Studio
        </Link>
      </div>
      <h1>New alpha</h1>

      <ApiErrorAlert error={mutation.error} />
      {mutation.error instanceof Error && !('status' in (mutation.error as object)) && (
        <p className="alert alert-error">{mutation.error.message}</p>
      )}
      {mutation.error instanceof ApiError && mutation.error.status === 409 && (
        <p className="muted">Choose a different name (duplicate).</p>
      )}

      <div className="alpha-detail-grid">
        <section className="stack alpha-detail-col-code">
          <h2>Alpha source (Python + JAX)</h2>
          <p className="muted small">
            Define a top-level <code>alpha(ctx)</code> function. After creation you can edit metadata
            and strategy in Studio.
          </p>
          <AlphaSourceEditor value={code} onChange={setCode} height="52vh" />
        </section>
        <section className="stack alpha-detail-col-meta">
          <h2>Details</h2>
          <form className="form-grid" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
            <label>
              Name
              <input type="text" {...form.register('name')} autoComplete="off" />
              {form.formState.errors.name && (
                <span className="alert alert-error">{form.formState.errors.name.message}</span>
              )}
            </label>
            <label>
              Description (optional)
              <input type="text" {...form.register('description')} />
            </label>
            <h3 className="finstrat-form-title">Strategy config</h3>
            <p className="muted small">Adjust below, then create — values are sent with the request.</p>
          </form>
          <FinStratConfigForm
            resetKey="new"
            config={defaultFinStratConfig}
            onValidChange={setFinstratDraft}
            isPending={false}
            submitLabel="Apply strategy to draft (optional)"
            onSubmit={setFinstratDraft}
          />
          <div className="row">
            <button
              type="button"
              className="btn btn-primary"
              disabled={mutation.isPending}
              onClick={() => form.handleSubmit((v) => mutation.mutate(v))()}
            >
              {mutation.isPending ? 'Creating…' : 'Create alpha'}
            </button>
          </div>
        </section>
      </div>
    </div>
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
      <div className="page-inner">
        <p className="muted">Missing alpha id.</p>
        <Link to="/studio" className="btn">
          ← Studio
        </Link>
      </div>
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

  const tabBtn = (id: RailTab, label: string) => (
    <button
      key={id}
      type="button"
      role="tab"
      aria-selected={railTab === id}
      className={`studio-rail-tab${railTab === id ? ' studio-rail-tab-active' : ''}`}
      onClick={() => setRailTab(id)}
    >
      {label}
    </button>
  )

  return (
    <div className="page-inner studio-shell stack">
      <div className="row" style={{ flexWrap: 'wrap', gap: '0.5rem 1rem' }}>
        <Link to="/studio" className="btn">
          ← Studio
        </Link>
      </div>

      <ApiErrorAlert error={alphaQ.error} />
      {alphaQ.isLoading && <p className="muted">Loading alpha…</p>}
      {!alphaQ.isLoading && !alphaQ.data && <p className="muted">Alpha not found.</p>}

      {alphaQ.data && (
        <>
          <header className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <h1 style={{ marginBottom: '0.15rem' }}>{alphaQ.data.name}</h1>
              <p className="mono muted small" style={{ margin: 0 }}>
                Studio · <span className="tabular-nums">{alphaQ.data.id}</span>
              </p>
            </div>
          </header>

          <div className="studio-main-grid">
            <section className="studio-editor-col stack">
              <h2 className="studio-panel-title">Alpha source</h2>
              <ApiErrorAlert error={codeMut.error} />
              <AlphaSourceEditor value={code} onChange={setCode} height="52vh" />
              <div className="row">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={codeMut.isPending}
                  onClick={() => codeMut.mutate(code)}
                >
                  {codeMut.isPending ? 'Saving…' : 'Save code'}
                </button>
              </div>
            </section>

            <section className="studio-rail stack">
              <div className="studio-rail-tabs" role="tablist" aria-label="Studio panels">
                {tabBtn('details', 'Details')}
                {tabBtn('strategy', 'Strategy')}
                {tabBtn('config', 'Backtest')}
                {tabBtn('console', 'Console')}
                {tabBtn('results', 'Results')}
              </div>

              <div className="studio-rail-body">
                <div
                  className="stack"
                  style={{ display: railTab === 'details' ? 'block' : 'none' }}
                  aria-hidden={railTab !== 'details'}
                >
                  <h3 className="studio-panel-title">Metadata</h3>
                  <ApiErrorAlert error={detailsMut.error} />
                  <form
                    className="form-grid"
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
                    <label>
                      Name
                      <input type="text" {...detailsForm.register('name')} />
                    </label>
                    <label>
                      Description
                      <input type="text" {...detailsForm.register('description')} />
                    </label>
                    {alphaQ.data.import_ref && (
                      <label>
                        Module import (read-only; overridden when inline source is saved)
                        <input
                          className="mono"
                          type="text"
                          readOnly
                          value={alphaQ.data.import_ref}
                        />
                      </label>
                    )}
                    {detailsForm.formState.errors.name && (
                      <span className="alert alert-error">
                        {detailsForm.formState.errors.name.message}
                      </span>
                    )}
                    <div className="row">
                      <button type="submit" className="btn" disabled={detailsMut.isPending}>
                        {detailsMut.isPending ? 'Saving…' : 'Save metadata'}
                      </button>
                    </div>
                  </form>

                  <h3 className="studio-panel-title" style={{ marginTop: '1rem' }}>
                    Delete alpha
                  </h3>
                  <ApiErrorAlert error={delMut.error} />
                  {delMut.error instanceof ApiError && delMut.error.status === 409 && (
                    <p className="muted">Cannot delete while backtest jobs reference this alpha.</p>
                  )}
                  <button
                    type="button"
                    className="btn btn-danger"
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
                  </button>
                </div>

                <div
                  className="stack"
                  style={{ display: railTab === 'strategy' ? 'block' : 'none' }}
                  aria-hidden={railTab !== 'strategy'}
                >
                  <ApiErrorAlert error={finstratMut.error} />
                  <FinStratConfigForm
                    config={finstratFromServer(alphaQ.data.finstrat_config)}
                    resetKey={alphaQ.data.updated_at}
                    isPending={finstratMut.isPending}
                    submitLabel="Update strategy config"
                    onSubmit={(c) => finstratMut.mutate(c)}
                  />
                </div>

                <div
                  className="stack"
                  style={{ display: railTab === 'config' ? 'block' : 'none' }}
                  aria-hidden={railTab !== 'config'}
                >
                  <BacktestConfigPanel
                    alphaId={alphaId}
                    formId={BT_FORM_ID}
                    hideInlineSubmit
                    onEnqueueSuccess={onEnqueueSuccess}
                  />
                </div>

                {railTab === 'console' && (
                  <div className="studio-console">
                    <p className="muted small" style={{ marginTop: 0 }}>
                      Live worker lines refresh while the job runs; status lines always reflect the
                      latest poll.
                    </p>
                    <pre className="studio-console-pre mono tabular-nums">{consoleText}</pre>
                    <ApiErrorAlert error={logsQ.error} />
                  </div>
                )}
                {railTab === 'results' && (
                  <div className="studio-results-tab stack">
                    <ApiErrorAlert error={resultQ.error} />
                    {job?.status !== 'succeeded' && (
                      <p className="muted">Run a backtest to completion to see the tearsheet.</p>
                    )}
                    {resultQ.data && <BacktestResultCharts data={resultQ.data} />}
                  </div>
                )}
              </div>

              <div className="studio-sticky-run row">
                <button type="submit" form={BT_FORM_ID} className="btn btn-primary">
                  Run backtest
                </button>
                {activeJobId && (
                  <Link className="btn" to={`/backtests/${encodeURIComponent(activeJobId)}`}>
                    Open job page
                  </Link>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
