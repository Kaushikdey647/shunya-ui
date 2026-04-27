import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { createAlpha } from '../api/endpoints'
import type { FinStratConfig } from '../api/types'
import { defaultFinStratConfig } from '../api/defaultConfigs'
import { DEFAULT_ALPHA_SOURCE } from '../alphaEditor/defaults'
import ApiErrorAlert from '../components/ApiErrorAlert'
import AlphaSourceEditor from '../components/AlphaSourceEditor'
import FinStratConfigForm from '../components/FinStratConfigForm'
import { ApiError } from '../api/client'

const alphaName = z
  .string()
  .min(1, 'Required')
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Alphanumeric, underscore, hyphen only')

const schema = z.object({
  name: alphaName,
  description: z.string().max(2048).optional(),
})

type FormValues = z.infer<typeof schema>

export default function AlphaNewPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [code, setCode] = useState(DEFAULT_ALPHA_SOURCE)
  const [finstratDraft, setFinstratDraft] = useState<FinStratConfig>(defaultFinStratConfig)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
    },
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
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
      navigate(`/alphas/${row.id}`)
    },
  })

  return (
    <div className="page-inner stack">
      <div className="row">
        <Link to="/alphas" className="btn">
          ← Alphas
        </Link>
      </div>
      <h1>New alpha</h1>

      <ApiErrorAlert error={mutation.error} />
      {mutation.error instanceof Error &&
        !('status' in (mutation.error as object)) && (
        <p className="alert alert-error">{mutation.error.message}</p>
      )}
      {mutation.error instanceof ApiError && mutation.error.status === 409 && (
        <p className="muted">Choose a different name (duplicate).</p>
      )}

      <div className="alpha-detail-grid">
        <section className="stack alpha-detail-col-code">
          <h2>Alpha source (Python + JAX)</h2>
          <p className="muted small">
            Define a top-level {`alpha(ctx)`} function. After creation you can set an optional
            {` import_ref`} on the detail page; inline source always wins at backtest time.
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
                <span className="alert alert-error">
                  {form.formState.errors.name.message}
                </span>
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
