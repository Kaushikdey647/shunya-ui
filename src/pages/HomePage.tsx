import MacroStrip from '../components/home/MacroStrip'
import HealthMiniCard from '../components/home/HealthMiniCard'
import MarketHeadlines from '../components/home/MarketHeadlines'
import MoversPanel from '../components/home/MoversPanel'
import RecentBacktestsFeed from '../components/home/RecentBacktestsFeed'
import WatchlistCard from '../components/home/WatchlistCard'

export default function HomePage() {
  return (
    <div className="page-inner home-dashboard">
      <header className="home-dashboard-header">
        <h1 style={{ margin: 0 }}>Dashboard</h1>
        <p className="muted" style={{ margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
          Macro context, movers, headlines, and your latest backtests.
        </p>
      </header>

      <MacroStrip />

      <div className="home-main-split">
        <div className="home-col-pulse stack">
          <MoversPanel />
          <MarketHeadlines />
        </div>
        <div className="home-col-engine stack">
          <RecentBacktestsFeed />
          <WatchlistCard />
          <HealthMiniCard />
        </div>
      </div>
    </div>
  )
}
