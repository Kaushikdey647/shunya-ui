import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { searchInstruments } from '../api/endpoints'
import ApiErrorAlert from '../components/ApiErrorAlert'

export default function SearchResultsPage() {
  const [params] = useSearchParams()
  const q = (params.get('q') ?? '').trim()

  const query = useQuery({
    queryKey: ['instrument-search-page', q],
    queryFn: () => searchInstruments(q),
    enabled: q.length > 0,
  })

  if (!q) {
    return (
      <div className="page-inner stack">
        <h1>Search</h1>
        <p className="muted">Enter a symbol or company name in the top search bar.</p>
      </div>
    )
  }

  return (
    <div className="page-inner stack">
      <h1>Results for “{q}”</h1>
      {query.isLoading && <p className="muted">Loading…</p>}
      <ApiErrorAlert error={query.error} />
      {query.data && (
        <>
          <section className="search-section">
            <h2>Instruments</h2>
            {query.data.quotes.length === 0 ? (
              <p className="muted">No matching instruments.</p>
            ) : (
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Name</th>
                      <th>Exchange</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {query.data.quotes.map((row) => (
                      <tr key={`${row.symbol}-${row.exchange ?? ''}`}>
                        <td>
                          <Link to={`/instruments/${encodeURIComponent(row.symbol)}`}>
                            <span className="mono">{row.symbol}</span>
                          </Link>
                        </td>
                        <td>{row.shortname ?? row.longname ?? '—'}</td>
                        <td className="muted">{row.exchange ?? '—'}</td>
                        <td className="muted">{row.quote_type ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="search-section">
            <h2>News</h2>
            {query.data.news.length === 0 ? (
              <p className="muted">No news in this search response.</p>
            ) : (
              <ul className="stack" style={{ gap: '0.65rem', listStyle: 'none', padding: 0 }}>
                {query.data.news.map((n, i) => (
                  <li key={`${n.title}-${i}`}>
                    {n.link ? (
                      <a href={n.link} target="_blank" rel="noopener noreferrer">
                        {n.title}
                      </a>
                    ) : (
                      <span>{n.title}</span>
                    )}
                    {n.publisher ? (
                      <span className="muted"> — {n.publisher}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {query.data.nav_links.length > 0 && (
            <section className="search-section">
              <h2>Links</h2>
              <div className="search-links">
                {query.data.nav_links.map((nl) => (
                  <a key={nl.url} href={nl.url} target="_blank" rel="noopener noreferrer">
                    {nl.title}
                  </a>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
