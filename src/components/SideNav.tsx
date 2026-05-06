import { NavLink as MantineNavLink, Stack } from '@mantine/core'
import { Link, matchPath, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true as const },
  { to: '/studio', label: 'Studio', end: false as const },
  { to: '/backtests', label: 'Backtests', end: false as const },
  { to: '/data', label: 'Data summary', end: false as const },
]

type Props = {
  onNavigate?: () => void
}

export default function SideNav({ onNavigate }: Props) {
  const location = useLocation()

  return (
    <Stack component="nav" gap={4} p="xs" aria-label="Primary">
      {NAV_ITEMS.map((item) => {
        const active = Boolean(
          matchPath({ path: item.to, end: item.end }, location.pathname),
        )
        return (
          <MantineNavLink
            key={item.to}
            component={Link}
            to={item.to}
            label={item.label}
            active={active}
            onClick={() => onNavigate?.()}
          />
        )
      })}
    </Stack>
  )
}
