import { heatmapCellColor, monthlyReturnsFromEquityCurve } from '../lib/monthlyReturnsHeatmap'

export default function MonthlyReturnsHeatmap({ equityCurve }: { equityCurve: Record<string, unknown>[] }) {
  const grid = monthlyReturnsFromEquityCurve(equityCurve)
  if (grid.years.length === 0) {
    return <p className="muted">Not enough monthly data for a returns heatmap.</p>
  }

  const monthLabels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

  return (
    <div className="table-wrap dashboard-chart-panel monthly-heatmap-panel">
      <div className="dashboard-chart-title">Monthly returns %</div>
      <div className="monthly-heatmap-scroll">
        <table className="monthly-heatmap-table data">
          <thead>
            <tr>
              <th className="monthly-heatmap-corner">Year</th>
              {grid.months.map((m) => (
                <th key={m} className="tabular-nums">
                  {monthLabels[m - 1]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.years.map((y) => (
              <tr key={y}>
                <th scope="row" className="tabular-nums">
                  {y}
                </th>
                {grid.months.map((mo) => {
                  const key = `${y}-${mo}`
                  const v = grid.values.get(key)
                  const label = v !== undefined ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` : '—'
                  return (
                    <td
                      key={key}
                      className="monthly-heatmap-cell tabular-nums"
                      style={{
                        background: heatmapCellColor(v, grid.normAbs),
                        color: 'var(--text-strong)',
                        textAlign: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                      }}
                      title={v !== undefined ? `${label}` : 'No data'}
                    >
                      {v !== undefined ? v.toFixed(1) : ''}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
