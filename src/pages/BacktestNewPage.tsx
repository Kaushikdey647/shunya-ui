import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { createAlpha, listAlphas } from '../api/endpoints'
import { defaultFinStratConfig } from '../api/defaultConfigs'
import type { FinStratConfig } from '../api/types'
import { DEFAULT_ALPHA_SOURCE } from '../alphaEditor/defaults'
import ApiErrorAlert from '../components/ApiErrorAlert'
import AlphaSourceEditor from '../components/AlphaSourceEditor'
import BacktestConfigPanel from '../components/BacktestConfigPanel'
import FinStratConfigForm from '../components/FinStratConfigForm'
import { ApiError } from '../api/client'

export default function BacktestNewPage() {
  const [params] = useSearchParams()
  const alphaFromQuery = params.get('alphaId')?.trim()
  if (alphaFromQuery) {
    return (
      <Navigate
        to={`/studio/${encodeURIComponent(alphaFromQuery)}`}
        replace
      />
    )
  }
  return <BacktestNewPageCore />
}

function BacktestNewPageCore() {
  const qc = useQueryClient()
  const [alphaId, setAlphaId] = useState('')
  const [draftOpen, setDraftOpen] = useState(false)
  const [code, setCode] = useState(DEFAULT_ALPHA_SOURCE)
  const [draftName, setDraftName] = useState('')
  const [finstratDraft, setFinstratDraft] = useState<FinStratConfig>(defaultFinStratConfig)

  const alphasQ = useQuery({
    queryKey: ['alphas', 'all-for-backtest'],
    queryFn: () => listAlphas({ limit: 500, offset: 0 }),
  })

  const createDraftMut = useMutation({
    mutationFn: async () => {
      const name = draftName.trim()
      const sc = code.trim()
      if (!name) throw new Error('Draft name is required.')
      if (!sc) throw new Error('Add alpha source code for the draft.')
      return createAlpha({
        name,
        description: undefined,
        import_ref: null,
        source_code: sc,
        finstrat_config: finstratDraft,
      })
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ['alphas'] })
      setAlphaId(row.id)
      setDraftOpen(false)
      setDraftName('')
      setCode(DEFAULT_ALPHA_SOURCE)
    },
  })

  const formId = 'page-backtest-config'

  return (
    <div className="page-inner stack">
      <div className="row">
        <Link to="/backtests" className="btn">
          ← Backtests
        </Link>
        <Link to="/studio" className="btn">
          Alpha Studio
        </Link>
      </div>
      <h1>New backtest</h1>

      <p className="muted small" style={{ margin: 0 }}>
        Prefer the unified{' '}
        <Link to="/studio">Alpha Studio</Link> (editor + config + results). This page remains for
        quick runs from the list.
      </p>

      <form
        className="form-grid"
        style={{ maxWidth: '40rem' }}
        onSubmit={(e) => {
          e.preventDefault()
        }}
      >
        <label>
          Alpha
          <select
            value={alphaId}
            onChange={(e) => setAlphaId(e.target.value)}
            required
            disabled={alphasQ.isLoading || !alphasQ.data?.length}
          >
            <option value="">
              {alphasQ.isLoading ? 'Loading…' : alphasQ.data?.length ? 'Select…' : 'No alphas'}
            </option>
            {(alphasQ.data ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      </form>

      {!alphasQ.isLoading && !(alphasQ.data?.length) && (
        <div className="stack">
          <p className="muted">No alphas yet. Save a draft below or create one from Studio.</p>
          <button type="button" className="btn" onClick={() => setDraftOpen((v) => !v)}>
            {draftOpen ? 'Hide draft creator' : 'Create draft alpha here'}
          </button>
          {draftOpen && (
            <div className="table-wrap dashboard-chart-panel stack">
              <ApiErrorAlert error={createDraftMut.error} />
              <label>
                Draft name (unique)
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  autoComplete="off"
                  placeholder="my_alpha_1"
                />
              </label>
              <AlphaSourceEditor value={code} onChange={setCode} height="36vh" />
              <FinStratConfigForm
                resetKey="draft-bt-new"
                config={defaultFinStratConfig}
                onValidChange={setFinstratDraft}
                isPending={createDraftMut.isPending}
                submitLabel="Apply strategy to draft"
                onSubmit={setFinstratDraft}
              />
              <button
                type="button"
                className="btn btn-primary"
                disabled={createDraftMut.isPending}
                onClick={() => createDraftMut.mutate()}
              >
                {createDraftMut.isPending ? 'Creating…' : 'Save draft alpha'}
              </button>
              {createDraftMut.error instanceof ApiError && createDraftMut.error.status === 409 && (
                <p className="muted">Choose a different name (duplicate).</p>
              )}
            </div>
          )}
        </div>
      )}

      {alphaId ? (
        <BacktestConfigPanel
          alphaId={alphaId}
          formId={formId}
          hideInlineSubmit={false}
        />
      ) : (
        <p className="muted">Select or create an alpha to configure the backtest.</p>
      )}
    </div>
  )
}
