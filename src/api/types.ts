/** API DTOs mirroring api OpenAPI — regenerate from `/openapi.json` (e.g. openapi-typescript) after backend schema changes. */
export type BarUnit =
  | 'SECONDS'
  | 'MINUTES'
  | 'HOURS'
  | 'DAYS'
  | 'WEEKS'
  | 'MONTHS'
  | 'YEARS'

export type FeatureMode = 'full' | 'ohlcv_only'
export type TradingAxisMode = 'observed' | 'canonical'
export type MarketDataProvider = 'auto' | 'timescale' | 'yfinance'
export type DecayMode = 'ema' | 'linear'
export type NanPolicy = 'strict' | 'zero_fill'
export type TemporalMode = 'bar_step' | 'elapsed_trading_time'
export type Neutralization = 'none' | 'market' | 'sector' | 'industry'
export type SectorCapMode = 'rescale' | 'raise'
export type ConstraintsMode = 'rescale' | 'raise'

export interface BarSpecModel {
  unit?: BarUnit
  step?: number
}

export interface FinTsRequest {
  start_date: string
  end_date: string
  ticker_list: string[]
  bar_spec?: BarSpecModel | null
  market_data_provider?: MarketDataProvider
  attach_yfinance_classifications?: boolean
  attach_fundamentals?: boolean
  feature_mode?: FeatureMode
  require_history_bars?: number | null
  trading_axis_mode?: TradingAxisMode
  strict_trading_grid?: boolean
  strict_provider_universe?: boolean
  strict_ohlcv?: boolean
  strict_empty?: boolean
}

export interface FinStratConfig {
  decay_mode?: DecayMode
  decay?: number
  decay_window?: number
  signal_delay?: number
  intraday_session_isolated_lag?: boolean
  nan_policy?: NanPolicy
  temporal_mode?: TemporalMode
  neutralization?: Neutralization
  truncation?: number
  max_single_weight?: number | null
  panel_columns?: string[] | null
}

export interface FinBtConfig {
  cash?: number
  commission?: number
  slippage_pct?: number
  group_column?: string | null
  sector_gross_cap_fraction?: number | null
  sector_cap_mode?: SectorCapMode
  sector_group_column?: string
  group_net_cap_fraction?: number | null
  turnover_budget_fraction?: number | null
  adv_participation_fraction?: number | null
  constraints_mode?: ConstraintsMode
  validate_finite_targets?: boolean
}

export interface AlphaCreate {
  name: string
  description?: string | null
  /** When set, takes precedence at backtest time. Either this or `import_ref` (or both). */
  source_code?: string | null
  import_ref?: string | null
  finstrat_config: FinStratConfig
}

export interface AlphaPatch {
  name?: string | null
  description?: string | null
  import_ref?: string | null
  source_code?: string | null
  finstrat_config?: FinStratConfig | null
}

export interface AlphaOut {
  id: string
  name: string
  description: string | null
  import_ref: string | null
  source_code: string | null
  finstrat_config: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface EquityIndexOut {
  code: string
  display_name: string
  member_count: number
  /** Yahoo-style raw index symbol (e.g. ^GSPC). */
  benchmark_ticker: string
}

export interface BacktestCreate {
  alpha_id: string
  /** When set, server resolves constituents from Timescale and sets raw index benchmark ticker. */
  index_code?: string | null
  fin_ts: FinTsRequest
  finstrat_override?: FinStratConfig | null
  finbt?: FinBtConfig
  benchmark_ticker?: string | null
  /** When true, result metrics and series include the test window from 2025-01-01 onward. */
  include_test_period_in_results?: boolean
  /**
   * When true with index_code: drop constituents with no OHLCV in the window; benchmark must still have bars.
   */
  omit_index_members_missing_ohlcv?: boolean
}

export type BacktestJobStatus = 'queued' | 'running' | 'succeeded' | 'failed'

export interface BacktestJobOut {
  id: string
  alpha_id: string
  alpha_name?: string | null
  index_code?: string | null
  include_test_period_in_results?: boolean
  status: BacktestJobStatus
  error_message: string | null
  result_summary: Record<string, unknown> | null
  created_at: string
  started_at: string | null
  finished_at: string | null
}

export interface BacktestLogLine {
  ts: string
  message: string
}

export interface BacktestTargetHistoryRow {
  date: string
  targets: Record<string, unknown>
}

export interface BacktestGroupExposureRow {
  date: string
  gross_by_group: Record<string, unknown>
  net_by_group: Record<string, unknown>
}

export interface BacktestResultPayload {
  job_id: string
  metrics: Record<string, unknown>
  equity_curve: Record<string, unknown>[]
  turnover_history: Record<string, unknown>[]
  benchmark?: Record<string, unknown> | null
  returns_analysis?: unknown
  drawdown_analysis?: unknown
  sharpe_analysis?: unknown
  target_history?: BacktestTargetHistoryRow[] | unknown[]
  group_exposure_history?: BacktestGroupExposureRow[]
}

export interface DataSummaryRequest extends FinTsRequest {
  columns?: string[] | null
}

export interface TickerNanRow {
  ticker: string
  nan_counts: Record<string, number>
}

export interface TickerRiskRow {
  ticker: string
  return_pct: number | null
  risk_ann_pct: number | null
  sharpe: number | null
  sortino: number | null
}

export interface DataSummaryResponse {
  tickers: string[]
  columns_used: string[]
  nan_counts: TickerNanRow[]
  per_ticker_metrics: TickerRiskRow[]
  bar_unit: string
  bar_step: number
  periods_per_year: number
}

export type DashboardBucketGranularity = 'day' | 'week' | 'month'

export type DashboardBucketParam = 'auto' | DashboardBucketGranularity

export interface DashboardBucketMeta {
  index: number
  start: string
  end: string
}

export interface TickerDashboardRow extends TickerRiskRow {
  first_ts: string | null
  last_ts: string | null
  raw_bar_count: number
  completeness_pct: number
  longest_run_buckets: number
  coverage: number[]
}

export interface ClassificationLabelCount {
  label: string
  count: number
}

export interface DataDashboardResponse {
  interval: string
  source: string
  bucket_granularity: DashboardBucketGranularity
  bucket_auto_subsampled: boolean
  reference_start: string
  reference_end: string
  bucket_count: number
  ticker_count: number
  truncated: boolean
  aggregate_mean_completeness_pct: number
  aggregate_median_completeness_pct: number
  completeness_histogram: number[]
  buckets: DashboardBucketMeta[]
  tickers: TickerDashboardRow[]
  per_ticker_metrics: TickerRiskRow[]
  bar_unit: string
  bar_step: number
  periods_per_year: number
  max_buckets: number
  sector_counts: ClassificationLabelCount[]
  industry_counts: ClassificationLabelCount[]
}

export type HealthComponentStatus = 'ok' | 'error'

export type OverallHealthStatus = 'ok' | 'degraded' | 'error'

export interface HealthCheckItem {
  status: HealthComponentStatus
  latency_ms: number
}

export interface HealthResponse {
  status: OverallHealthStatus
  backend: HealthCheckItem
  database: HealthCheckItem
  yfinance: HealthCheckItem
}

function isHealthCheckItem(v: unknown): v is HealthCheckItem {
  if (v === null || typeof v !== 'object') return false
  const h = v as Record<string, unknown>
  return (
    (h.status === 'ok' || h.status === 'error') &&
    typeof h.latency_ms === 'number'
  )
}

/** True when the JSON body matches {@link HealthResponse} (avoids crashes on HTML/plaintext/wrong API). */
export function isHealthResponse(x: unknown): x is HealthResponse {
  if (x === null || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  const s = o.status
  if (s !== 'ok' && s !== 'degraded' && s !== 'error') return false
  return isHealthCheckItem(o.backend) && isHealthCheckItem(o.database) && isHealthCheckItem(o.yfinance)
}

export type MoversKind = 'gainers' | 'losers' | 'active'

export interface MarketSnapshotRow {
  symbol: string
  last: number | null
  pct_change_1d: number | null
  volume: number | null
  sparkline_close: number[]
}

export interface MarketSnapshotResponse {
  rows: MarketSnapshotRow[]
}

export interface MarketMoverRow {
  ticker: string
  price: number | null
  pct_change: number | null
  volume: number | null
}

export interface MarketMoversResponse {
  kind: MoversKind
  rows: MarketMoverRow[]
}

export interface MarketHeadlineItem {
  title: string
  publisher?: string | null
  link?: string | null
  published_at?: string | null
}

export interface MarketHeadlinesResponse {
  headlines: MarketHeadlineItem[]
}

export interface InstrumentSearchQuote {
  symbol: string
  shortname?: string | null
  longname?: string | null
  exchange?: string | null
  quote_type?: string | null
}

export interface InstrumentSearchNewsItem {
  title: string
  link?: string | null
  publisher?: string | null
}

export interface InstrumentNavLink {
  title: string
  url: string
}

export interface InstrumentSearchResponse {
  quotes: InstrumentSearchQuote[]
  news: InstrumentSearchNewsItem[]
  nav_links: InstrumentNavLink[]
}

export interface InstrumentTickerNewsItem {
  title: string
  link?: string | null
  publisher?: string | null
  published_at?: string | null
  story_id?: string | null
  content_type?: string | null
  summary?: string | null
  description?: string | null
  provider_url?: string | null
  provider_source_id?: string | null
  canonical_site?: string | null
  canonical_region?: string | null
  canonical_lang?: string | null
  is_hosted?: boolean | null
  thumbnail_url?: string | null
  editors_pick?: boolean | null
  is_premium_news?: boolean | null
  is_premium_free_news?: boolean | null
}

export interface InstrumentTickerNewsResponse {
  symbol: string
  news: InstrumentTickerNewsItem[]
}

export interface OhlcvBar {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume?: number | null
}

export type InstrumentOhlcvDataSource = 'timescale' | 'yfinance'

export type InstrumentOhlcvStorageStatus = 'none' | 'ok' | 'failed' | 'deferred'

export interface InstrumentOhlcvResponse {
  symbol: string
  interval: string
  period: string
  bars: OhlcvBar[]
  data_source?: InstrumentOhlcvDataSource
  storage_status?: InstrumentOhlcvStorageStatus
  storage_error?: string | null
  storage_job_id?: number | null
  storage_skipped?: boolean
}

export type InstrumentKind =
  | 'equity'
  | 'etf'
  | 'mutualfund'
  | 'option'
  | 'index'
  | 'currency'
  | 'future'
  | 'crypto'
  | 'structured'
  | 'unknown'

export type InstrumentStatement = 'income' | 'balance' | 'cashflow'

export type InstrumentFinancialFrequency = 'quarterly' | 'annual'

export interface InstrumentFeatureAvailability {
  financials: boolean
  holders: boolean
  options_chain: boolean
}

export interface InstrumentValuationMetrics {
  trailing_pe?: number | null
  forward_pe?: number | null
  trailing_eps?: number | null
  forward_eps?: number | null
  return_on_equity?: number | null
  return_on_assets?: number | null
  price_to_book?: number | null
  price_to_sales?: number | null
  debt_to_equity?: number | null
}

export interface InstrumentExecutive {
  name?: string | null
  title?: string | null
  year_born?: number | null
}

export interface InstrumentCompanyProfile {
  long_business_summary?: string | null
  sector?: string | null
  industry?: string | null
  address_line1?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
  country?: string | null
  phone?: string | null
  website?: string | null
  full_time_employees?: number | null
}

export interface InstrumentFundTopHolding {
  symbol: string
  name?: string | null
  holding_percent?: number | null
}

export interface InstrumentFundSummary {
  fund_family?: string | null
  category?: string | null
  expense_ratio?: number | null
  yield_pct?: number | null
  top_holdings?: InstrumentFundTopHolding[]
}

export interface InstrumentOptionContractSummary {
  underlying_symbol?: string | null
  strike?: number | null
  expire_date?: string | null
  contract_type?: string | null
  last_price?: number | null
  bid?: number | null
  ask?: number | null
  volume?: number | null
  open_interest?: number | null
  implied_volatility?: number | null
}

export interface InstrumentOverviewResponse {
  symbol: string
  instrument_kind: InstrumentKind
  yahoo_quote_type?: string | null
  short_name?: string | null
  long_name?: string | null
  exchange?: string | null
  currency?: string | null
  market_cap?: number | null
  beta?: number | null
  valuation: InstrumentValuationMetrics
  company?: InstrumentCompanyProfile | null
  fund?: InstrumentFundSummary | null
  option_contract?: InstrumentOptionContractSummary | null
  executives: InstrumentExecutive[]
  features: InstrumentFeatureAvailability
}

export interface InstrumentFinancialLineRow {
  label: string
  values: (number | null)[]
}

export interface InstrumentFinancialStatementResponse {
  symbol: string
  statement: InstrumentStatement
  frequency: InstrumentFinancialFrequency
  periods: string[]
  rows: InstrumentFinancialLineRow[]
  truncated: boolean
  available: boolean
}

export interface InstrumentHolderRow {
  holder: string
  date_reported?: string | null
  shares?: number | null
  value?: number | null
  percent_held?: number | null
  percent_change?: number | null
}

export interface InstrumentHoldersResponse {
  symbol: string
  institutional: InstrumentHolderRow[]
  mutual_funds: InstrumentHolderRow[]
  available_institutional: boolean
  available_mutual_funds: boolean
}

export interface InstrumentOptionExpirationsResponse {
  symbol: string
  expirations: string[]
  available: boolean
}

export interface InstrumentOptionLegRow {
  strike: number
  last?: number | null
  bid?: number | null
  ask?: number | null
  volume?: number | null
  open_interest?: number | null
  implied_volatility?: number | null
}

export interface InstrumentOptionChainResponse {
  symbol: string
  expiry: string
  calls: InstrumentOptionLegRow[]
  puts: InstrumentOptionLegRow[]
  available: boolean
}

export interface InstrumentIvHeatmapResponse {
  symbol: string
  expirations: string[]
  strikes: number[]
  iv_calls: (number | null)[][]
  iv_puts: (number | null)[][]
  available: boolean
}

/** Cached ``get_valuation_measures()``-style table (columns + records). */
export interface InstrumentValuationMeasuresPayload {
  symbol: string
  available: boolean
  columns: string[]
  records: Record<string, unknown>[]
}

export interface InstrumentYfinanceTablePayload {
  columns: string[]
  records: Record<string, unknown>[]
}

export interface InstrumentYfinanceTableResponse {
  symbol: string
  available: boolean
  data: InstrumentYfinanceTablePayload
}

export interface InstrumentAnalystPriceTargetsResponse {
  symbol: string
  available: boolean
  current?: number | null
  low?: number | null
  high?: number | null
  mean?: number | null
  median?: number | null
}

export interface InstrumentJsonBlobResponse {
  symbol: string
  available: boolean
  data: Record<string, unknown>
}
