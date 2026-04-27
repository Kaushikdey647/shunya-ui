import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { enqueueBacktest } from '../api/endpoints'
import { defaultFinBtConfig, defaultFinTsRequest } from '../api/defaultConfigs'
import type { FinBtConfig, FinStratConfig, FinTsRequest } from '../api/types'
import FinTsAdvancedSection from '../components/FinTsAdvancedSection'
import {
  applyFinTsAdvanced,
  initialFinTsAdvancedState,
  type FinTsAdvancedState,
} from '../finTs/advancedState'
import ApiErrorAlert from '../components/ApiErrorAlert'
import { parseTickerList } from '../utils/tickers'

export default function BacktestNewPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [alphaId, setAlphaId] = useState('')
  const [tickers, setTickers] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [benchmarkTicker, setBenchmarkTicker] = useState('')

  const [finTsAdv, setFinTsAdv] = useState<FinTsAdvancedState>(() =>
    initialFinTsAdvancedState(),
  )

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

  const mutation = useMutation({
    mutationFn: () => {
      const ticker_list = parseTickerList(tickers)
      if (!alphaId.trim()) throw new Error('Alpha id is required.')
      if (!startDate || !endDate) throw new Error('Start and end dates are required.')
      if (ticker_list.length === 0) throw new Error('At least one ticker is required.')

      const fin_ts: FinTsRequest = defaultFinTsRequest({
        start_date: startDate,
        end_date: endDate,
        ticker_list,
      })
      applyFinTsAdvanced(fin_ts, finTsAdv)

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
        alpha_id: alphaId.trim(),
        fin_ts,
        finstrat_override,
        finbt,
        benchmark_ticker: benchmarkTicker.trim() || undefined,
      })
    },
    onSuccess: (job) => {
      void qc.invalidateQueries({ queryKey: ['backtests'] })
      void navigate(`/backtests/${job.id}`)
    },
  })

  return (
    <div className="stack">
      <div className="row">
        <Link to="/backtests" className="btn">
          ← Backtests
        </Link>
      </div>
      <h1>New backtest</h1>

      <ApiErrorAlert error={mutation.error} />

      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault()
          mutation.mutate()
        }}
      >
        <label>
          Alpha id
          <input
            type="text"
            value={alphaId}
            onChange={(e) => setAlphaId(e.target.value)}
            className="mono"
            required
          />
        </label>
        <label>
          Tickers (comma-separated)
          <input
            type="text"
            value={tickers}
            onChange={(e) => setTickers(e.target.value)}
            placeholder="AAPL, MSFT"
            required
          />
        </label>
        <label>
          Start date
          <input
            type="text"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="YYYY-MM-DD"
            required
          />
        </label>
        <label>
          End date
          <input
            type="text"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="YYYY-MM-DD"
            required
          />
        </label>
        <label>
          Benchmark ticker (optional)
          <input
            type="text"
            value={benchmarkTicker}
            onChange={(e) => setBenchmarkTicker(e.target.value)}
          />
        </label>

        <FinTsAdvancedSection state={finTsAdv} setState={setFinTsAdv} />

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

        <div className="row">
          <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Enqueueing…' : 'Run backtest'}
          </button>
        </div>
      </form>
    </div>
  )
}
