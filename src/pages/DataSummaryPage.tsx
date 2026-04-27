import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { postDataSummary } from '../api/endpoints'
import { defaultFinTsRequest } from '../api/defaultConfigs'
import type { DataSummaryRequest, DataSummaryResponse, FinTsRequest } from '../api/types'
import FinTsAdvancedSection from '../components/FinTsAdvancedSection'
import {
  applyFinTsAdvanced,
  initialFinTsAdvancedState,
  type FinTsAdvancedState,
} from '../finTs/advancedState'
import ApiErrorAlert from '../components/ApiErrorAlert'
import { parseTickerList } from '../utils/tickers'

export default function DataSummaryPage() {
  const [tickers, setTickers] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [columnsComma, setColumnsComma] = useState('')

  const [finTsAdv, setFinTsAdv] = useState<FinTsAdvancedState>(() =>
    initialFinTsAdvancedState(),
  )

  const [result, setResult] = useState<DataSummaryResponse | null>(null)

  const mutation = useMutation({
    mutationFn: () => {
      const ticker_list = parseTickerList(tickers)
      if (!startDate || !endDate) throw new Error('Start and end dates are required.')
      if (ticker_list.length === 0) throw new Error('At least one ticker is required.')

      const fin_ts: FinTsRequest = defaultFinTsRequest({
        start_date: startDate,
        end_date: endDate,
        ticker_list,
      })
      applyFinTsAdvanced(fin_ts, finTsAdv)

      const cols = columnsComma
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)

      const body: DataSummaryRequest = {
        ...fin_ts,
        columns: cols.length > 0 ? cols : undefined,
      }
      return postDataSummary(body)
    },
    onSuccess: (data) => {
      setResult(data)
    },
  })

  return (
    <div className="stack">
      <div className="row">
        <Link to="/" className="btn">
          ← Home
        </Link>
      </div>
      <h1>Data summary</h1>
      <p className="muted">
        <code className="mono">POST /data</code> — panel NaN counts and per-ticker risk
        metrics for a fin_ts window.
      </p>

      <ApiErrorAlert error={mutation.error} />

      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault()
          mutation.mutate()
        }}
      >
        <label>
          Tickers (comma-separated)
          <input
            type="text"
            value={tickers}
            onChange={(e) => setTickers(e.target.value)}
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
          Columns (optional, comma-separated)
          <input
            type="text"
            value={columnsComma}
            onChange={(e) => setColumnsComma(e.target.value)}
            placeholder="omit = all numeric columns"
          />
        </label>

        <FinTsAdvancedSection state={finTsAdv} setState={setFinTsAdv} />

        <div className="row">
          <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Computing…' : 'Run summary'}
          </button>
        </div>
      </form>

      {result && (
        <section className="stack">
          <h2>Response</h2>
          <p className="muted">
            Bar: <strong>{result.bar_unit}</strong> step <strong>{result.bar_step}</strong>,
            periods/year <strong>{result.periods_per_year}</strong>
          </p>
          <p className="muted">
            Tickers: {result.tickers.join(', ')} — columns used:{' '}
            {result.columns_used.join(', ')}
          </p>

          <h3>NaN counts</h3>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>NaN counts (JSON)</th>
                </tr>
              </thead>
              <tbody>
                {result.nan_counts.map((r) => (
                  <tr key={r.ticker}>
                    <td className="mono">{r.ticker}</td>
                    <td className="mono">
                      {JSON.stringify(r.nan_counts)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3>Per-ticker metrics</h3>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>return_pct</th>
                  <th>risk_ann_pct</th>
                  <th>sharpe</th>
                  <th>sortino</th>
                </tr>
              </thead>
              <tbody>
                {result.per_ticker_metrics.map((r) => (
                  <tr key={r.ticker}>
                    <td className="mono">{r.ticker}</td>
                    <td>{r.return_pct ?? ''}</td>
                    <td>{r.risk_ann_pct ?? ''}</td>
                    <td>{r.sharpe ?? ''}</td>
                    <td>{r.sortino ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
