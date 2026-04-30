import { NavLink } from 'react-router-dom'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `side-nav-link${isActive ? ' side-nav-link-active' : ''}`

export default function SideNav() {
  return (
    <aside className="side-nav" aria-label="Primary">
      <nav className="side-nav-inner">
        <NavLink to="/" end className={linkClass}>
          Home
        </NavLink>
        <NavLink to="/studio" className={linkClass}>
          Studio
        </NavLink>
        <NavLink to="/backtests" className={linkClass}>
          Backtests
        </NavLink>
        <NavLink to="/data" className={linkClass}>
          Data summary
        </NavLink>
      </nav>
    </aside>
  )
}
