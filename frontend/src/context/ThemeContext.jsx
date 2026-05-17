import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ThemeContext = createContext(undefined)

const STORAGE_KEY = 'clubms-theme'

function getSystemPreference() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(theme) {
  return theme === 'system' ? getSystemPreference() : theme
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
  })

  const resolvedTheme = resolveTheme(theme)

  const applyTheme = useCallback((resolved) => {
    document.documentElement.classList.toggle('dark', resolved === 'dark')
  }, [])

  useEffect(() => {
    applyTheme(resolvedTheme)
  }, [resolvedTheme, applyTheme])

  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme(getSystemPreference())
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme, applyTheme])

  const setTheme = useCallback((next) => {
    setThemeState(next)
    localStorage.setItem(STORAGE_KEY, next)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
