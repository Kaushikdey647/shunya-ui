import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { createAlpha } from '../api/endpoints'
import type { FinStratConfig } from '../api/types'
import { defaultFinStratConfig } from '../api/defaultConfigs'
import ApiErrorAlert from '../components/ApiErrorAlert'
import { ApiError } from '../api/client'

const alphaName = z
  .string()
  .min(1, 'Required')
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Alphanumeric, underscore, hyphen only')

const schema = z.object({
  name: alphaName,
  description: z.string().max(2048).optional(),
  import_ref: z.string().min(1, 'Required').max(256),
  finstrat_json: z
    .string()
    .min(1, 'Required')
    .superRefine((val, ctx) => {
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

type FormValues = z.infer<typeof schema>

export default function AlphaNewPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      import_ref: '',
      finstrat_json: JSON.stringify(defaultFinStratConfig, null, 2),
    },
  })

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      let finstrat_config: FinStratConfig
      try {
        finstrat_config = JSON.parse(values.finstrat_json) as FinStratConfig
      } catch {
        throw new Error('Invalid finstrat JSON')
      }
      return createAlpha({
        name: values.name,
        description: values.description || undefined,
        import_ref: values.import_ref,
        finstrat_config,
      })
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ['alphas'] })
      void navigate(`/alphas/${row.id}`)
    },
  })

  return (
    <div className="stack">
      <div className="row">
        <Link to="/alphas" className="btn">
          ← Alphas
        </Link>
      </div>
      <h1>New alpha</h1>

      <ApiErrorAlert error={mutation.error} />
      {mutation.error instanceof ApiError && mutation.error.status === 409 && (
        <p className="muted">Choose a different name (duplicate).</p>
      )}

      <form
        className="form-grid"
        onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
      >
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
        <label>
          Import ref
          <input type="text" {...form.register('import_ref')} />
          {form.formState.errors.import_ref && (
            <span className="alert alert-error">
              {form.formState.errors.import_ref.message}
            </span>
          )}
        </label>
        <label>
          Finstrat config (JSON)
          <textarea {...form.register('finstrat_json')} />
          {form.formState.errors.finstrat_json && (
            <span className="alert alert-error">
              {form.formState.errors.finstrat_json.message}
            </span>
          )}
        </label>
        <div className="row">
          <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )
}
