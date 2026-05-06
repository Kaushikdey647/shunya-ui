import { AppShell as MantineAppShell, Box } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import CommandPalette from './CommandPalette'
import SideNav from './SideNav'
import TopNav from './TopNav'

export default function AppShell() {
  const [cmdOpen, setCmdOpen] = useState(false)
  const [mobileNavOpened, { toggle: toggleMobileNav, close: closeMobileNav }] = useDisclosure()

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
    <MantineAppShell
      header={{ height: 44 }}
      navbar={{
        width: 200,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileNavOpened },
      }}
      padding={0}
      transitionDuration={280}
      transitionTimingFunction="cubic-bezier(0.4, 0, 0.2, 1)"
    >
      <MantineAppShell.Header>
        <TopNav mobileNavOpened={mobileNavOpened} onMobileNavToggle={toggleMobileNav} />
      </MantineAppShell.Header>
      <MantineAppShell.Navbar p={0}>
        <SideNav onNavigate={closeMobileNav} />
      </MantineAppShell.Navbar>
      {/* Do not set p/pt/pb/ps/pe on Main — they override shell offsets for header, navbar, aside, footer. */}
      <MantineAppShell.Main>
        <Box pb={{ base: 'sm', md: 'md' }}>
          <Outlet />
        </Box>
      </MantineAppShell.Main>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </MantineAppShell>
  )
}
