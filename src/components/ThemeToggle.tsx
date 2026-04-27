import { useCallback, useEffect, useState } from 'react'
import { applyTheme, resolveInitialTheme, type Theme, toggleTheme } from '../theme'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => resolveInitialTheme())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const onClick = useCallback(() => {
    setTheme((t) => toggleTheme(t))
  }, [])

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onClick}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  )
}
