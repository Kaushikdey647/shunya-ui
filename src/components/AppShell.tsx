import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import CommandPalette from './CommandPalette'
import SideNav from './SideNav'
import TopNav from './TopNav'

export default function AppShell() {
  const [cmdOpen, setCmdOpen] = useState(false)

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCmdOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  return (
    <div className="app-shell">
      <TopNav />
      <div className="app-shell-body">
        <SideNav />
        <main className="app-shell-main">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  )
}
