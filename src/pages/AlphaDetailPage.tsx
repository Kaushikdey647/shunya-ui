import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { ApiError } from '../api/client'
import { deleteAlpha, getAlpha, patchAlpha } from '../api/endpoints'
import type { FinStratConfig } from '../api/types'
import ApiErrorAlert from '../components/ApiErrorAlert'

const alphaName = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/)
  .optional()

const patchSchema = z.object({
  name: alphaName,
  description: z.string().max(2048).optional().nullable(),
  import_ref: z.string().min(1).max(256).optional(),
  finstrat_json: z
    .string()
    .optional()
    .superRefine((val, ctx) => {
      if (val == null || val === '') return
      try {
        JSON.parse(val) as unknown
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid JSON',
        })
      }
    }),
})

type PatchForm = z.infer<typeof patchSchema>

export default function AlphaDetailPage() {
  const { alphaId } = useParams<{ alphaId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const q = useQuery({
    queryKey: ['alpha', alphaId],
    queryFn: () => getAlpha(alphaId!),
    enabled: Boolean(alphaId),
  })

  const form = useForm<PatchForm>({
    resolver: zodResolver(patchSchema),
    defaultValues: {},
  })

  useEffect(() => {
    if (!q.data) return
    form.reset({
      name: q.data.name,
      description: q.data.description ?? '',
      import_ref: q.data.import_ref,
      finstrat_json: JSON.stringify(q.data.finstrat_config, null, 2),
    })
  }, [q.data, form])

  const patchMut = useMutation({
    mutationFn: async (values: PatchForm) => {
      const body: {
        name?: string
        description?: string | null
        import_ref?: string
        finstrat_config?: FinStratConfig
      } = {}
      if (values.name != null && values.name !== q.data?.name) {
        body.name = values.name
      }
      const desc = values.description === '' ? null : values.description
      if (desc !== q.data?.description) body.description = desc
      if (values.import_ref != null && values.import_ref !== q.data?.import_ref) {
        body.import_ref = values.import_ref
      }
      if (values.finstrat_json != null && values.finstrat_json !== '') {
        const next = JSON.parse(values.finstrat_json) as FinStratConfig
        const prev = JSON.stringify(q.data?.finstrat_config ?? {})
        if (JSON.stringify(next) !== prev) body.finstrat_config = next
      }
      return patchAlpha(alphaId!, body)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['alpha', alphaId] })
      void qc.invalidateQueries({ queryKey: ['alphas'] })
    },
  })

  const delMut = useMutation({
    mutationFn: () => deleteAlpha(alphaId!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['alphas'] })
      void navigate('/alphas')
    },
  })

  if (!alphaId) {
    return <p className="muted">Missing alpha id.</p>
  }

  return (
    <div className="stack">
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

          <section className="stack">
            <h2>Edit</h2>
            <ApiErrorAlert error={patchMut.error} />
            <form
              className="form-grid"
              onSubmit={form.handleSubmit((v) => patchMut.mutate(v))}
            >
              <label>
                Name
                <input type="text" {...form.register('name')} />
              </label>
              <label>
                Description
                <input type="text" {...form.register('description')} />
              </label>
              <label>
                Import ref
                <input type="text" {...form.register('import_ref')} />
              </label>
              <label>
                Finstrat config (JSON)
                <textarea {...form.register('finstrat_json')} />
              </label>
              {(form.formState.errors.finstrat_json ||
                form.formState.errors.name) && (
                <span className="alert alert-error">
                  {form.formState.errors.finstrat_json?.message ??
                    form.formState.errors.name?.message}
                </span>
              )}
              <div className="row">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={patchMut.isPending}
                >
                  {patchMut.isPending ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </section>

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
