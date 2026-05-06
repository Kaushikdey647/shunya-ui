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
