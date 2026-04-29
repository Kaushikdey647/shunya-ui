import { apiFetch } from './client'
import type {
  AlphaCreate,
  AlphaOut,
  AlphaPatch,
  BacktestCreate,
  BacktestJobOut,
  BacktestResultPayload,
  DashboardBucketParam,
  DataDashboardResponse,
  DataSummaryRequest,
  DataSummaryResponse,
  HealthResponse,
  InstrumentOhlcvResponse,
  InstrumentSearchResponse,
  InstrumentTickerNewsResponse,
  EquityIndexOut,
} from './types'

export async function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('/health', { method: 'GET' })
}

export async function listEquityIndices(): Promise<EquityIndexOut[]> {
  return apiFetch<EquityIndexOut[]>('/indices', { method: 'GET' })
}

export async function listAlphas(params: {
  limit?: number
  offset?: number
}): Promise<AlphaOut[]> {
  const sp = new URLSearchParams()
  if (params.limit != null) sp.set('limit', String(params.limit))
  if (params.offset != null) sp.set('offset', String(params.offset))
  const q = sp.toString()
  return apiFetch<AlphaOut[]>(`/alphas${q ? `?${q}` : ''}`, { method: 'GET' })
}

export async function getAlpha(alphaId: string): Promise<AlphaOut> {
  return apiFetch<AlphaOut>(`/alphas/${encodeURIComponent(alphaId)}`, {
    method: 'GET',
  })
}

export async function createAlpha(body: AlphaCreate): Promise<AlphaOut> {
  return apiFetch<AlphaOut>('/alphas', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function patchAlpha(
  alphaId: string,
  body: AlphaPatch,
): Promise<AlphaOut> {
  return apiFetch<AlphaOut>(`/alphas/${encodeURIComponent(alphaId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function deleteAlpha(alphaId: string): Promise<void> {
  await apiFetch<void>(`/alphas/${encodeURIComponent(alphaId)}`, {
    method: 'DELETE',
  })
}

export async function listBacktests(params: {
  limit?: number
  offset?: number
  alpha_id?: string | null
  status?: string | null
}): Promise<BacktestJobOut[]> {
  const sp = new URLSearchParams()
  if (params.limit != null) sp.set('limit', String(params.limit))
  if (params.offset != null) sp.set('offset', String(params.offset))
  if (params.alpha_id) sp.set('alpha_id', params.alpha_id)
  if (params.status) sp.set('status', params.status)
  const q = sp.toString()
  return apiFetch<BacktestJobOut[]>(`/backtests${q ? `?${q}` : ''}`, {
    method: 'GET',
  })
}

export async function deleteBacktest(jobId: string): Promise<void> {
  await apiFetch<void>(`/backtests/${encodeURIComponent(jobId)}`, {
    method: 'DELETE',
  })
}

export async function deleteBacktestsBatch(
  ids: string[],
): Promise<{ deleted: number }> {
  return apiFetch<{ deleted: number }>('/backtests/delete-batch', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  })
}

export async function getBacktest(jobId: string): Promise<BacktestJobOut> {
  return apiFetch<BacktestJobOut>(`/backtests/${encodeURIComponent(jobId)}`, {
    method: 'GET',
  })
}

export async function getBacktestResult(
  jobId: string,
): Promise<BacktestResultPayload> {
  return apiFetch<BacktestResultPayload>(
    `/backtests/${encodeURIComponent(jobId)}/result`,
    { method: 'GET' },
  )
}

export async function enqueueBacktest(
  body: BacktestCreate,
): Promise<BacktestJobOut> {
  return apiFetch<BacktestJobOut>('/backtests', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function postDataSummary(
  body: DataSummaryRequest,
): Promise<DataSummaryResponse> {
  return apiFetch<DataSummaryResponse>('/data', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function getDataDashboard(params: {
  interval?: string
  source?: string
  bucket?: DashboardBucketParam
  max_buckets?: number
}): Promise<DataDashboardResponse> {
  const sp = new URLSearchParams()
  if (params.interval != null) sp.set('interval', params.interval)
  if (params.source != null) sp.set('source', params.source)
  if (params.bucket != null) sp.set('bucket', params.bucket)
  if (params.max_buckets != null) sp.set('max_buckets', String(params.max_buckets))
  const q = sp.toString()
  return apiFetch<DataDashboardResponse>(`/data/dashboard${q ? `?${q}` : ''}`, {
    method: 'GET',
  })
}

export async function searchInstruments(q: string): Promise<InstrumentSearchResponse> {
  const qs = new URLSearchParams({ q })
  return apiFetch<InstrumentSearchResponse>(`/instruments/search?${qs.toString()}`, {
    method: 'GET',
  })
}

export async function getInstrumentNews(
  symbol: string,
  params?: { limit?: number },
): Promise<InstrumentTickerNewsResponse> {
  const sp = new URLSearchParams()
  if (params?.limit != null) sp.set('limit', String(params.limit))
  const q = sp.toString()
  return apiFetch<InstrumentTickerNewsResponse>(
    `/instruments/${encodeURIComponent(symbol)}/news${q ? `?${q}` : ''}`,
    { method: 'GET' },
  )
}

export async function getInstrumentOhlcv(
  symbol: string,
  params: { interval: string; period: string },
): Promise<InstrumentOhlcvResponse> {
  const qs = new URLSearchParams({
    interval: params.interval,
    period: params.period,
  })
  return apiFetch<InstrumentOhlcvResponse>(
    `/instruments/${encodeURIComponent(symbol)}/ohlcv?${qs.toString()}`,
    { method: 'GET' },
  )
}
