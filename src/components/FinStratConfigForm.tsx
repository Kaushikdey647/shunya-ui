import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { defaultFinStratConfig } from '../api/defaultConfigs'
import type { FinStratConfig } from '../api/types'

export type FinStratFormValues = {
  decay_mode: 'ema' | 'linear'
  decay: string
  decay_window: string
  signal_delay: string
  intraday_session_isolated_lag: boolean
  nan_policy: 'strict' | 'zero_fill'
  temporal_mode: 'bar_step' | 'elapsed_trading_time'
  neutralization: 'none' | 'market' | 'sector' | 'industry'
  truncation: string
  max_single_weight_str: string
  panel_columns_str: string
}

function coalesceNeutralizationForForm(
  n: FinStratConfig['neutralization'] | undefined,
): FinStratFormValues['neutralization'] {
  const raw = n as string | undefined
  if (raw === 'group') return 'sector'
  if (raw === 'none' || raw === 'market' || raw === 'sector' || raw === 'industry') {
    return raw
  }
  return 'market'
}

function toForm(c: FinStratConfig): FinStratFormValues {
  return {
    decay_mode: c.decay_mode ?? 'ema',
    decay: String(c.decay ?? 0),
    decay_window: String(c.decay_window ?? 1),
    signal_delay: String(c.signal_delay ?? 0),
    intraday_session_isolated_lag: c.intraday_session_isolated_lag ?? false,
    nan_policy: c.nan_policy ?? 'strict',
    temporal_mode: c.temporal_mode ?? 'bar_step',
    neutralization: coalesceNeutralizationForForm(c.neutralization),
    truncation: String(c.truncation ?? 0),
    max_single_weight_str:
      c.max_single_weight != null && !Number.isNaN(c.max_single_weight)
        ? String(c.max_single_weight)
        : '',
    panel_columns_str: c.panel_columns?.length ? c.panel_columns.join(', ') : '',
  }
}

function parseFormValues(v: FinStratFormValues):
  | { ok: true; config: FinStratConfig }
  | { ok: false; message: string } {
  const decay = Number(v.decay)
  const decay_window = Number(v.decay_window)
  const signal_delay = Number(v.signal_delay)
  const truncation = Number(v.truncation)
  if (Number.isNaN(decay) || decay < 0 || decay >= 1) {
    return { ok: false, message: 'Decay must be a number in [0, 1).' }
  }
  if (Number.isNaN(decay_window) || !Number.isInteger(decay_window) || decay_window < 1) {
    return { ok: false, message: 'Decay window must be a positive integer.' }
  }
  if (Number.isNaN(signal_delay) || !Number.isInteger(signal_delay) || signal_delay < 0) {
    return { ok: false, message: 'Signal delay must be a non-negative integer.' }
  }
  if (Number.isNaN(truncation) || truncation < 0 || truncation >= 0.5) {
    return { ok: false, message: 'Truncation must be a number in [0, 0.5).' }
  }
  const t = v.max_single_weight_str.trim()
  if (t !== '') {
    const w = Number(t)
    if (Number.isNaN(w) || w <= 0 || w > 1) {
      return { ok: false, message: 'Max single weight: empty or a number in (0, 1].' }
    }
  }
  const max_single_weight = t === '' ? undefined : Number(t)
  const cols = v.panel_columns_str
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
  return {
    ok: true,
    config: {
      decay_mode: v.decay_mode,
      decay,
      decay_window,
      signal_delay,
      intraday_session_isolated_lag: v.intraday_session_isolated_lag,
      nan_policy: v.nan_policy,
      temporal_mode: v.temporal_mode,
      neutralization: v.neutralization,
      truncation,
      max_single_weight,
      panel_columns: cols.length ? cols : undefined,
    },
  }
}

type Props = {
  config: FinStratConfig
  /** Change when the server sends new config to reset the form. */
  resetKey?: string
  onSubmit: (c: FinStratConfig) => void
  /** Fires when the form values (debounced) parse to a valid config. */
  onValidChange?: (c: FinStratConfig) => void
  isPending: boolean
  submitLabel: string
  /** Shown on validation error on submit. */
  formError?: string | null
}

export default function FinStratConfigForm({
  config,
  resetKey,
  onSubmit,
  onValidChange,
  isPending,
  submitLabel,
  formError,
}: Props) {
  const form = useForm<FinStratFormValues>({
    defaultValues: toForm({ ...defaultFinStratConfig, ...config }),
  })
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const merged = toForm({ ...defaultFinStratConfig, ...config })
    form.reset(merged)
    if (onValidChange) {
      const p = parseFormValues(merged)
      if (p.ok) onValidChange(p.config)
    }
  }, [resetKey, form, config, onValidChange])

  // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form watch()
  const decayMode = form.watch('decay_mode')

  const watched = form.watch()
  useEffect(() => {
    if (!onValidChange) return
    if (debRef.current) clearTimeout(debRef.current)
    debRef.current = setTimeout(() => {
      const p = parseFormValues(watched as FinStratFormValues)
      if (p.ok) onValidChange(p.config)
    }, 200)
    return () => {
      if (debRef.current) clearTimeout(debRef.current)
    }
  }, [watched, onValidChange])

  return (
    <form
      className="form-grid"
      onSubmit={form.handleSubmit((vals) => {
        const p = parseFormValues(vals)
        if (!p.ok) {
          form.setError('root', { type: 'manual', message: p.message })
          return
        }
        onSubmit(p.config)
        form.clearErrors('root')
      })}
    >
      <h3 className="finstrat-form-title">Strategy config (finstrat)</h3>
      {(formError || form.formState.errors.root) && (
        <span className="alert alert-error">
          {formError ?? (form.formState.errors.root as { message?: string })?.message}
        </span>
      )}
      <label>
        Decay mode
        <select {...form.register('decay_mode')}>
          <option value="ema">ema (EMA coefficient)</option>
          <option value="linear">linear (fixed window)</option>
        </select>
      </label>
      {decayMode === 'ema' ? (
        <label>
          Decay (EMA coefficient in [0, 1))
          <input type="number" step="any" {...form.register('decay')} />
        </label>
      ) : (
        <label>
          Decay window (bars, integer ≥ 1)
          <input type="number" step="1" {...form.register('decay_window')} />
        </label>
      )}
      <label>
        Signal delay
        <input type="number" step="1" {...form.register('signal_delay')} />
      </label>
      <label className="row" style={{ alignItems: 'center', gap: '0.5rem' }}>
        <input type="checkbox" {...form.register('intraday_session_isolated_lag')} />
        Intraday session isolated lag
      </label>
      <label>
        NaN policy
        <select {...form.register('nan_policy')}>
          <option value="strict">strict</option>
          <option value="zero_fill">zero_fill</option>
        </select>
      </label>
      <label>
        Temporal mode
        <select {...form.register('temporal_mode')}>
          <option value="bar_step">bar_step</option>
          <option value="elapsed_trading_time">elapsed_trading_time</option>
        </select>
      </label>
      <label>
        Neutralization
        <select {...form.register('neutralization')}>
          <option value="none">None</option>
          <option value="market">Market</option>
          <option value="sector">Sector</option>
          <option value="industry">Industry</option>
        </select>
      </label>
      <label>
        Truncation
        <input type="number" step="any" {...form.register('truncation')} />
      </label>
      <label>
        Max single weight (0–1, empty = none)
        <input type="text" {...form.register('max_single_weight_str')} />
      </label>
      <label>
        Panel columns (comma-separated, optional)
        <input type="text" {...form.register('panel_columns_str')} />
      </label>
      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={isPending}>
          {isPending ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
