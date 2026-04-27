import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { ApiError } from '../api/client'
import { deleteAlpha, getAlpha, patchAlpha } from '../api/endpoints'
import { defaultFinStratConfig } from '../api/defaultConfigs'
import type { FinStratConfig } from '../api/types'
import { DEFAULT_ALPHA_SOURCE } from '../alphaEditor/defaults'
import ApiErrorAlert from '../components/ApiErrorAlert'
import AlphaSourceEditor from '../components/AlphaSourceEditor'
import FinStratConfigForm from '../components/FinStratConfigForm'

const alphaName = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/)
  .optional()

const detailsSchema = z.object({
  name: alphaName,
  description: z.string().max(2048).optional().nullable(),
})

type DetailsForm = z.infer<typeof detailsSchema>

function finstratFromServer(raw: Record<string, unknown> | null | undefined): FinStratConfig {
  if (!raw || typeof raw !== 'object') {
    return { ...defaultFinStratConfig }
  }
  return { ...defaultFinStratConfig, ...raw } as FinStratConfig
}

export default function AlphaDetailPage() {
  const { alphaId } = useParams<{ alphaId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [code, setCode] = useState('')

  const q = useQuery({
    queryKey: ['alpha', alphaId],
    queryFn: () => getAlpha(alphaId!),
    enabled: Boolean(alphaId),
  })

  const detailsForm = useForm<DetailsForm>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {},
  })

  useEffect(() => {
    if (!q.data) return
    detailsForm.reset({
      name: q.data.name,
      description: q.data.description ?? '',
    })
    // Sync local editor from server (react-query refetch / navigation).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- controlled editor reset from API
    setCode(
      q.data.source_code != null && q.data.source_code.trim() !== ''
        ? q.data.source_code
        : DEFAULT_ALPHA_SOURCE,
    )
  }, [q.data, detailsForm])

  const detailsMut = useMutation({
    mutationFn: (body: { name?: string; description?: string | null }) =>
      patchAlpha(alphaId!, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['alpha', alphaId] })
      void qc.invalidateQueries({ queryKey: ['alphas'] })
    },
  })

  const codeMut = useMutation({
    mutationFn: (source_code: string) =>
      patchAlpha(alphaId!, { source_code: source_code.trim() === '' ? null : source_code }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['alpha', alphaId] })
      void qc.invalidateQueries({ queryKey: ['alphas'] })
    },
  })

  const finstratMut = useMutation({
    mutationFn: (finstrat_config: FinStratConfig) =>
      patchAlpha(alphaId!, { finstrat_config }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['alpha', alphaId] })
      void qc.invalidateQueries({ queryKey: ['alphas'] })
    },
  })

  const delMut = useMutation({
    mutationFn: () => deleteAlpha(alphaId!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['alphas'] })
      navigate('/alphas')
    },
  })

  if (!alphaId) {
    return (
      <div className="page-inner">
        <p className="muted">Missing alpha id.</p>
      </div>
    )
  }

  return (
    <div className="page-inner stack">
      <div className="row">
        <Link to="/alphas" className="btn">
          ← Alphas
        </Link>
      </div>

      <ApiErrorAlert error={q.error} />
      {q.isLoading && <p className="muted">Loading…</p>}
      {q.data && (
        <>
          <h1>{q.data.name}</h1>
          <p className="mono muted">id: {q.data.id}</p>

          <div className="alpha-detail-grid">
            <section className="stack alpha-detail-col-code">
              <h2>Alpha source (Python + JAX)</h2>
              <p className="muted small">
                If non-empty, this source is used for backtests instead of the module import.
              </p>
              <ApiErrorAlert error={codeMut.error} />
              <AlphaSourceEditor value={code} onChange={setCode} height="58vh" />
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

            <section className="stack alpha-detail-col-meta">
              <h2>Metadata</h2>
              <ApiErrorAlert error={detailsMut.error} />
              <form
                className="form-grid"
                onSubmit={detailsForm.handleSubmit((v) => {
                  if (!q.data) return
                  const body: { name?: string; description?: string | null } = {}
                  if (v.name != null && v.name !== q.data.name) body.name = v.name
                  const desc = v.description === '' ? null : v.description
                  if (desc !== (q.data.description ?? null)) body.description = desc
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
                {q.data.import_ref && (
                  <label>
                    Module import (read-only; overridden when inline source is saved)
                    <input
                      className="mono"
                      type="text"
                      readOnly
                      value={q.data.import_ref}
                    />
                  </label>
                )}
                {(detailsForm.formState.errors.name) && (
                  <span className="alert alert-error">
                    {detailsForm.formState.errors.name?.message}
                  </span>
                )}
                <div className="row">
                  <button
                    type="submit"
                    className="btn"
                    disabled={detailsMut.isPending}
                  >
                    {detailsMut.isPending ? 'Saving…' : 'Save metadata'}
                  </button>
                </div>
              </form>

              <h2>Strategy</h2>
              <ApiErrorAlert error={finstratMut.error} />
              <FinStratConfigForm
                config={finstratFromServer(q.data.finstrat_config)}
                resetKey={q.data.updated_at}
                isPending={finstratMut.isPending}
                submitLabel="Update strategy config"
                onSubmit={(c) => finstratMut.mutate(c)}
              />
            </section>
          </div>

          <section className="stack">
            <h2>Delete</h2>
            <ApiErrorAlert error={delMut.error} />
            {delMut.error instanceof ApiError && delMut.error.status === 409 && (
              <p className="muted">
                Cannot delete while backtest jobs reference this alpha.
              </p>
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
          </section>
        </>
      )}
    </div>
  )
}
