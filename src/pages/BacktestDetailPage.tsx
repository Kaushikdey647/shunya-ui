import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getBacktest, getBacktestResult } from '../api/endpoints'
import ApiErrorAlert from '../components/ApiErrorAlert'

const TABLE_PREVIEW = 100

function RowTable({ rows }: { rows: Record<string, unknown>[] }) {
  const [expanded, setExpanded] = useState(false)
  const keys = useMemo(() => {
    const first = rows[0]
    if (!first || typeof first !== 'object') return [] as string[]
    return Object.keys(first)
  }, [rows])

  if (rows.length === 0) {
    return <p className="muted">No rows.</p>
  }

  const shown = expanded ? rows : rows.slice(0, TABLE_PREVIEW)

  return (
    <div className="stack">
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              {keys.map((k) => (
                <th key={k}>{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, i) => (
              <tr key={i}>
                {keys.map((k) => (
                  <td key={k} className="mono">
                    {formatCell(row[k])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > TABLE_PREVIEW && (
        <button
          type="button"
          className="btn"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? 'Show less' : `Show all (${rows.length} rows)`}
        </button>
      )}
    </div>
  )
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : ''
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

export default function BacktestDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const [rawJson, setRawJson] = useState(false)

  const jobQ = useQuery({
    queryKey: ['backtest', jobId],
    queryFn: () => getBacktest(jobId!),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const s = query.state.data?.status
      return s === 'queued' || s === 'running' ? 2000 : false
    },
  })

  const resultQ = useQuery({
    queryKey: ['backtest-result', jobId],
    queryFn: () => getBacktestResult(jobId!),
    enabled: jobQ.data?.status === 'succeeded',
  })

  if (!jobId) {
    return (
      <div className="page-inner">
        <p className="muted">Missing job id.</p>
      </div>
    )
  }

  return (
    <div className="page-inner stack">
      <div className="row">
        <Link to="/backtests" className="btn">
          ← Backtests
        </Link>
      </div>

      <ApiErrorAlert error={jobQ.error} />
      {jobQ.isLoading && <p className="muted">Loading job…</p>}

      {jobQ.data && (
        <>
          <h1>Backtest job</h1>
          <p className="mono muted">id: {jobQ.data.id}</p>
          <dl className="row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div>
              <dt className="muted">Status</dt>
              <dd>
                <strong>{jobQ.data.status}</strong>
              </dd>
            </div>
            <div>
              <dt className="muted">Alpha id</dt>
              <dd className="mono">{jobQ.data.alpha_id}</dd>
            </div>
            <div>
              <dt className="muted">Created</dt>
              <dd>{new Date(jobQ.data.created_at).toLocaleString()}</dd>
            </div>
            {jobQ.data.started_at && (
              <div>
                <dt className="muted">Started</dt>
                <dd>{new Date(jobQ.data.started_at).toLocaleString()}</dd>
              </div>
            )}
            {jobQ.data.finished_at && (
              <div>
                <dt className="muted">Finished</dt>
                <dd>{new Date(jobQ.data.finished_at).toLocaleString()}</dd>
              </div>
            )}
            {jobQ.data.error_message && (
              <div>
                <dt className="muted">Error</dt>
                <dd className="alert alert-error">{jobQ.data.error_message}</dd>
              </div>
            )}
            {jobQ.data.result_summary && (
              <div>
                <dt className="muted">Result summary</dt>
                <dd>
                  <pre className="mono" style={{ whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(jobQ.data.result_summary, null, 2)}
                  </pre>
                </dd>
              </div>
            )}
          </dl>

          {jobQ.data.status === 'succeeded' && (
            <section className="stack">
              <h2>Result</h2>
              <label className="row">
                <input
                  type="checkbox"
                  checked={rawJson}
                  onChange={(e) => setRawJson(e.target.checked)}
                />
                Show raw JSON
              </label>
              <ApiErrorAlert error={resultQ.error} />
              {resultQ.isLoading && <p className="muted">Loading result…</p>}
              {resultQ.data && rawJson && (
                <pre className="mono" style={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>
                  {JSON.stringify(resultQ.data, null, 2)}
                </pre>
              )}
              {resultQ.data && !rawJson && (
                <>
                  <h3>Metrics</h3>
                  <div className="table-wrap">
                    <table className="data">
                      <tbody>
                        {Object.entries(resultQ.data.metrics).map(([k, v]) => (
                          <tr key={k}>
                            <th>{k}</th>
                            <td className="mono">{formatCell(v)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {resultQ.data.benchmark != null && (
                    <>
                      <h3>Benchmark</h3>
                      <pre className="mono" style={{ whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(resultQ.data.benchmark, null, 2)}
                      </pre>
                    </>
                  )}
                  <h3>Equity curve</h3>
                  <RowTable rows={resultQ.data.equity_curve} />
                  <h3>Turnover history</h3>
                  <RowTable rows={resultQ.data.turnover_history} />
                </>
              )}
            </section>
          )}
        </>
      )}
    </div>
  )
}
