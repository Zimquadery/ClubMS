import { useTheme } from '@/context/ThemeContext'
import { Button } from '@/components/ui/button'
import { Sun, Moon, Monitor } from 'lucide-react'

const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor }
const THEME_ORDER = ['light', 'dark', 'system']

function ThemeToggleIcon({ theme }) {
  return (
    <div className="relative h-4 w-4">
      {THEME_ORDER.map((key) => {
        const Icon = THEME_ICONS[key]
        const active = theme === key
        return (
          <Icon
            key={key}
            className="absolute inset-0 h-4 w-4 transition-[opacity,transform] duration-200 ease-out-quart"
            style={{ opacity: active ? 1 : 0, transform: active ? 'rotate(0deg) scale(1)' : 'rotate(-90deg) scale(0.6)' }}
          />
        )
      })}
    </div>
  )
}

export function ThemeToggle({ className }) {
  const { theme, setTheme } = useTheme()
  const cycleTheme = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(next)
  }
  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      onClick={cycleTheme}
      aria-label={`Switch theme, currently ${theme}`}
    >
      <ThemeToggleIcon theme={theme} />
    </Button>
  )
}
