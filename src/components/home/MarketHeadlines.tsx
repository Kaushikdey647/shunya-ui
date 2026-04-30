import { useQuery } from '@tanstack/react-query'
import { getMarketHeadlines } from '../../api/endpoints'
import ApiErrorAlert from '../ApiErrorAlert'

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso.slice(0, 16)
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

export default function MarketHeadlines() {
  const q = useQuery({
    queryKey: ['market', 'headlines'],
    queryFn: () => getMarketHeadlines({ limit: 30 }),
    staleTime: 120_000,
  })

  return (
    <div className="dashboard-chart-panel home-headlines-panel">
      <div className="dashboard-chart-title">Market headlines</div>
      <ApiErrorAlert error={q.error} />
      {q.isLoading && <p className="muted">Loading headlines…</p>}
      {!q.isLoading && q.data && (
        <ul className="home-headlines-list">
          {q.data.headlines.length === 0 ? (
            <li className="muted">No headlines</li>
          ) : (
            q.data.headlines.map((h, i) => (
              <li key={`${h.title}-${i}`} className="home-headline-item">
                {h.link ? (
                  <a href={h.link} target="_blank" rel="noreferrer" className="home-headline-title">
                    {h.title}
                  </a>
                ) : (
                  <span className="home-headline-title">{h.title}</span>
                )}
                <div className="home-headline-meta muted">
                  <span>{h.publisher ?? '—'}</span>
                  <span className="mono">{fmtTime(h.published_at)}</span>
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
