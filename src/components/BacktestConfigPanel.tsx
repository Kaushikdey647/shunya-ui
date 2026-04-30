import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BACKTEST_SIM_END_EXCLUSIVE,
  BACKTEST_SIM_START,
  BACKTEST_TEST_START,
} from '../api/backtestWindows'
import { enqueueBacktest, listEquityIndices } from '../api/endpoints'
import { defaultFinBtConfig, defaultFinTsRequest } from '../api/defaultConfigs'
import type { BacktestJobOut, FinBtConfig, FinStratConfig, FinTsRequest } from '../api/types'
import FinTsAdvancedSection from '../components/FinTsAdvancedSection'
import {
  applyFinTsAdvanced,
  initialFinTsAdvancedState,
  type FinTsAdvancedState,
} from '../finTs/advancedState'
import ApiErrorAlert from './ApiErrorAlert'

function initialAdvForIndexBacktest(): FinTsAdvancedState {
  const s = initialFinTsAdvancedState()
  s.marketDataProvider = 'timescale'
  s.attachYf = false
  s.attachFund = false
  return s
}

export type BacktestConfigPanelProps = {
  alphaId: string
  /** Target form for external sticky submit button (`form` attribute). */
  formId: string
  /** Hide inline submit when using a sticky footer button with `form={formId}`. */
  hideInlineSubmit?: boolean
  onEnqueueSuccess?: (job: BacktestJobOut) => void
}

export default function BacktestConfigPanel({
  alphaId,
  formId,
  hideInlineSubmit = false,
  onEnqueueSuccess,
}: BacktestConfigPanelProps) {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [indexCode, setIndexCode] = useState('')
  const [includeTestInResults, setIncludeTestInResults] = useState(false)
  const [omitMembersMissingOhlcv, setOmitMembersMissingOhlcv] = useState(true)

  const [finTsAdv, setFinTsAdv] = useState<FinTsAdvancedState>(initialAdvForIndexBacktest)

  const [finstratOverrideJson, setFinstratOverrideJson] = useState('')
  const [finbtCash, setFinbtCash] = useState(String(defaultFinBtConfig.cash))
  const [finbtCommission, setFinbtCommission] = useState(
    String(defaultFinBtConfig.commission),
  )
  const [finbtSlippage, setFinbtSlippage] = useState(
    String(defaultFinBtConfig.slippage_pct),
  )
  const [finbtSectorGroupCol, setFinbtSectorGroupCol] = useState(
    defaultFinBtConfig.sector_group_column ?? 'Sector',
  )
  const [finbtValidateFinite, setFinbtValidateFinite] = useState(
    defaultFinBtConfig.validate_finite_targets ?? true,
  )

  const indicesQ = useQuery({
    queryKey: ['equity-indices'],
    queryFn: () => listEquityIndices(),
  })

  const indicesWithMembers = useMemo(
    () => (indicesQ.data ?? []).filter((ix) => ix.member_count > 0),
    [indicesQ.data],
  )

  useEffect(() => {
    // Sync selected index when equity index list loads / changes (same as legacy backtest page).
    if (!indexCode || !indicesWithMembers.length) return
    if (!indicesWithMembers.some((x) => x.code === indexCode)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- invalidate stale index selection when catalog updates
      setIndexCode('')
    }
  }, [indexCode, indicesWithMembers])

  const selectedBenchmark = useMemo(() => {
    if (!indexCode || !indicesQ.data) return null
    const row = indicesQ.data.find((x) => x.code === indexCode)
    return row?.benchmark_ticker ?? null
  }, [indexCode, indicesQ.data])

  const mutation = useMutation({
    mutationFn: () => {
      const aid = alphaId.trim()
      if (!aid) throw new Error('Missing alpha.')
      if (!indexCode.trim()) throw new Error('Select an index.')

      const fin_ts: FinTsRequest = defaultFinTsRequest({
        start_date: BACKTEST_SIM_START,
        end_date: BACKTEST_SIM_END_EXCLUSIVE,
        ticker_list: [],
      })
      applyFinTsAdvanced(fin_ts, finTsAdv)
      fin_ts.market_data_provider = 'timescale'
      fin_ts.attach_yfinance_classifications = false
      fin_ts.attach_fundamentals = false

      let finstrat_override: FinStratConfig | undefined
      const o = finstratOverrideJson.trim()
      if (o !== '') {
        try {
          finstrat_override = JSON.parse(o) as FinStratConfig
        } catch {
          throw new Error('Invalid finstrat_override JSON.')
        }
      }

      const finbt: FinBtConfig = {
        ...defaultFinBtConfig,
        cash: Number(finbtCash),
        commission: Number(finbtCommission),
        slippage_pct: Number(finbtSlippage),
        sector_group_column: finbtSectorGroupCol,
        validate_finite_targets: finbtValidateFinite,
      }

      return enqueueBacktest({
        alpha_id: aid,
        index_code: indexCode.trim(),
        fin_ts,
        finstrat_override,
        finbt,
        include_test_period_in_results: includeTestInResults,
        omit_index_members_missing_ohlcv: omitMembersMissingOhlcv,
      })
    },
    onSuccess: (job) => {
      void qc.invalidateQueries({ queryKey: ['backtests'] })
      if (onEnqueueSuccess) {
        onEnqueueSuccess(job)
      } else {
        void navigate(`/backtests/${job.id}`)
      }
    },
  })

  return (
    <>
      <ApiErrorAlert error={mutation.error} />

      <form
        id={formId}
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault()
          mutation.mutate()
        }}
      >
        <label>
          Index universe
          <select
            value={indexCode}
            onChange={(e) => setIndexCode(e.target.value)}
            required
            disabled={indicesQ.isLoading || !indicesWithMembers.length}
          >
            <option value="">
              {indicesQ.isLoading
                ? 'Loading…'
                : indicesWithMembers.length
                  ? 'Select…'
                  : indicesQ.data?.length
                    ? 'No index has members yet (sync memberships)'
                    : 'No indices (run DB migrations)'}
            </option>
            {indicesWithMembers.map((ix) => (
              <option key={ix.code} value={ix.code}>
                {ix.display_name} ({ix.member_count} members)
              </option>
            ))}
          </select>
        </label>

        {!indicesQ.isLoading &&
          indicesQ.data &&
          indicesQ.data.length > 0 &&
          indicesWithMembers.length === 0 && (
            <p className="muted" style={{ margin: 0 }}>
              Timescale has index catalog rows but no{' '}
              <code className="mono">symbol_index_membership</code> data. From the repo:{' '}
              <code className="mono">shunya-timescale sync-index-memberships</code> (or run{' '}
              <code className="mono">scripts/bootstrap_sp500_ohlcv.py</code>
              ), then refresh this page.
            </p>
          )}

        {selectedBenchmark && (
          <p className="muted" style={{ margin: 0 }}>
            Benchmark index (raw ticker): <span className="mono">{selectedBenchmark}</span>
          </p>
        )}

        <div className="muted stack" style={{ gap: '0.35rem' }}>
          <p style={{ margin: 0 }}>
            <strong>Tune</strong> window:{' '}
            <span className="mono">{BACKTEST_SIM_START}</span> –{' '}
            <span className="mono">{BACKTEST_TEST_START}</span> (end exclusive).{' '}
            <strong>Test</strong> window:{' '}
            <span className="mono">{BACKTEST_TEST_START}</span> –{' '}
            <span className="mono">{BACKTEST_SIM_END_EXCLUSIVE}</span> (end exclusive).
          </p>
          <p style={{ margin: 0 }}>
            Simulation always uses <strong>daily</strong> bars over{' '}
            <span className="mono">{BACKTEST_SIM_START}</span> through the last bar before{' '}
            <span className="mono">{BACKTEST_SIM_END_EXCLUSIVE}</span> (same range the server
            enforces).
          </p>
        </div>

        <label className="row">
          <input
            type="checkbox"
            checked={includeTestInResults}
            onChange={(e) => setIncludeTestInResults(e.target.checked)}
          />
          Include test period ({BACKTEST_TEST_START.slice(0, 4)}–
          {BACKTEST_SIM_END_EXCLUSIVE.slice(0, 4)}) in results
        </label>

        <label className="row">
          <input
            type="checkbox"
            checked={omitMembersMissingOhlcv}
            onChange={(e) => setOmitMembersMissingOhlcv(e.target.checked)}
          />
          Skip index members with no OHLCV in the simulation window (benchmark ticker must still
          have data in Timescale)
        </label>

        <FinTsAdvancedSection
          state={finTsAdv}
          setState={setFinTsAdv}
          timescaleOnly
          hideBarSpec
        />

        <details className="advanced">
          <summary>Advanced (overrides, finbt)</summary>
          <div className="form-grid" style={{ marginTop: '0.75rem' }}>
            <label>
              Finstrat override (JSON, optional)
              <textarea
                value={finstratOverrideJson}
                onChange={(e) => setFinstratOverrideJson(e.target.value)}
                placeholder="{}"
              />
            </label>
            <label>
              finbt.cash
              <input
                type="number"
                value={finbtCash}
                onChange={(e) => setFinbtCash(e.target.value)}
              />
            </label>
            <label>
              finbt.commission
              <input
                type="number"
                step="any"
                value={finbtCommission}
                onChange={(e) => setFinbtCommission(e.target.value)}
              />
            </label>
            <label>
              finbt.slippage_pct
              <input
                type="number"
                step="any"
                value={finbtSlippage}
                onChange={(e) => setFinbtSlippage(e.target.value)}
              />
            </label>
            <label>
              finbt.sector_group_column
              <input
                type="text"
                value={finbtSectorGroupCol}
                onChange={(e) => setFinbtSectorGroupCol(e.target.value)}
              />
            </label>
            <label className="row">
              <input
                type="checkbox"
                checked={finbtValidateFinite}
                onChange={(e) => setFinbtValidateFinite(e.target.checked)}
              />
              finbt.validate_finite_targets
            </label>
          </div>
        </details>

        {!hideInlineSubmit && (
          <div className="row">
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Enqueueing…' : 'Run backtest'}
            </button>
          </div>
        )}
      </form>
    </>
  )
}
