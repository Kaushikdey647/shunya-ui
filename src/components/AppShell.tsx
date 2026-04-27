import { Outlet } from 'react-router-dom'
import SideNav from './SideNav'
import TopNav from './TopNav'

export default function AppShell() {
  return (
    <div className="app-shell">
      <TopNav />
      <div className="app-shell-body">
        <SideNav />
        <main className="app-shell-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
