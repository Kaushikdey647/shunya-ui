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
export type Neutralization = 'none' | 'market' | 'group'
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
  import_ref: string
  finstrat_config: FinStratConfig
}

export interface AlphaPatch {
  name?: string | null
  description?: string | null
  import_ref?: string | null
  finstrat_config?: FinStratConfig | null
}

export interface AlphaOut {
  id: string
  name: string
  description: string | null
  import_ref: string
  finstrat_config: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface BacktestCreate {
  alpha_id: string
  fin_ts: FinTsRequest
  finstrat_override?: FinStratConfig | null
  finbt?: FinBtConfig
  benchmark_ticker?: string | null
}

export type BacktestJobStatus = 'queued' | 'running' | 'succeeded' | 'failed'

export interface BacktestJobOut {
  id: string
  alpha_id: string
  status: BacktestJobStatus
  error_message: string | null
  result_summary: Record<string, unknown> | null
  created_at: string
  started_at: string | null
  finished_at: string | null
}

export interface BacktestResultPayload {
  job_id: string
  metrics: Record<string, unknown>
  equity_curve: Record<string, unknown>[]
  turnover_history: Record<string, unknown>[]
  benchmark?: Record<string, unknown> | null
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
