import { useQuery } from '@tanstack/react-query'
import { getHealth } from '../api/endpoints'
import type { HealthResponse } from '../api/types'

function healthTitle(data: HealthResponse) {
  return `API ${data.status} · backend ${data.backend.status} ${data.backend.latency_ms}ms · db ${data.database.status} ${data.database.latency_ms}ms · yfinance ${data.yfinance.status} ${data.yfinance.latency_ms}ms`
}

export default function HealthIndicator() {
  const q = useQuery({ queryKey: ['health'], queryFn: getHealth, staleTime: 15_000 })

  if (q.isLoading) {
    return <span className="health-dot health-dot-pending" title="API status" aria-label="Checking API" />
  }
  if (q.isError || !q.data) {
    return (
      <span
        className="health-dot health-dot-error"
        title="API unreachable"
        aria-label="API error"
      />
    )
  }
  const { data } = q
  if (data.status === 'error') {
    return (
      <span
        className="health-dot health-dot-error"
        title={healthTitle(data)}
        aria-label="API unhealthy"
      />
    )
  }
  if (data.status === 'degraded') {
    return (
      <span
        className="health-dot health-dot-degraded"
        title={healthTitle(data)}
        aria-label="API degraded"
      />
    )
  }
  return (
    <span className="health-dot health-dot-ok" title={healthTitle(data)} aria-label="API healthy" />
  )
}
