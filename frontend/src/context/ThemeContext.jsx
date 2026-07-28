import { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback } from 'react'

const ThemeContext = createContext(undefined)

const STORAGE_KEY = 'clubms-theme'

function getSystemPreference() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(theme) {
  return theme === 'system' ? getSystemPreference() : theme
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
  })

  const resolvedTheme = resolveTheme(theme)

  const applyTheme = useCallback((resolved) => {
    const root = document.documentElement
    const shouldDark = resolved === 'dark'
    if (root.classList.contains('dark') === shouldDark) return
    const mutate = () => root.classList.toggle('dark', shouldDark)
    if (document.startViewTransition && !prefersReducedMotion()) {
      document.startViewTransition(() => mutate())
    } else {
      mutate()
    }
  }, [])

  useLayoutEffect(() => {
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
