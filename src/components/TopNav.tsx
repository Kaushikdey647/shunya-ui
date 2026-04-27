import { NavLink } from 'react-router-dom'
import HealthIndicator from './HealthIndicator'
import ThemeToggle from './ThemeToggle'
import TickerSearch from './TickerSearch'

export default function TopNav() {
  return (
    <header className="top-nav">
      <div className="top-nav-left">
        <NavLink to="/" className="top-nav-brand" end>
          Shunya
        </NavLink>
      </div>
      <div className="top-nav-center">
        <TickerSearch />
      </div>
      <div className="top-nav-right">
        <HealthIndicator />
        <ThemeToggle />
      </div>
    </header>
  )
}
