import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/context/ThemeContext'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { RouteErrorBoundary } from '@/components/ErrorBoundary'
import { LayoutDashboard, Users, Calendar, LogOut, Shield, Menu, X, UserCircle, ClipboardList, Sun, Moon, Monitor, MapPin } from 'lucide-react'

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

export function Layout() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const universityName = import.meta.env.VITE_UNIVERSITY_NAME || 'ClubMS'
  const logoUrl = import.meta.env.VITE_LOGO_URL
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const cycleTheme = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(next)
  }

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const linkClass = ({ isActive }) =>
    `flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${isActive ? 'text-foreground font-medium bg-accent' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'}`

  const navLinks = user ? (
    <>
      <NavLink to="/dashboard" className={linkClass} onClick={() => setMobileMenuOpen(false)}>
        <LayoutDashboard className="h-4 w-4" />
        Dashboard
      </NavLink>
      <NavLink to="/clubs" className={linkClass} onClick={() => setMobileMenuOpen(false)}>
        <Users className="h-4 w-4" />
        Clubs
      </NavLink>
      <NavLink to="/events" className={linkClass} onClick={() => setMobileMenuOpen(false)}>
        <Calendar className="h-4 w-4" />
        Events
      </NavLink>
      {user.role === 'PLATFORM_ADMIN' && (
        <>
          <NavLink to="/admin/clubs" className={linkClass} onClick={() => setMobileMenuOpen(false)}>
            <Shield className="h-4 w-4" />
            Manage Clubs
          </NavLink>
          <NavLink to="/admin/venues" className={linkClass} onClick={() => setMobileMenuOpen(false)}>
            <MapPin className="h-4 w-4" />
            Manage Venues
          </NavLink>
          <NavLink to="/admin/audit-logs" className={linkClass} onClick={() => setMobileMenuOpen(false)}>
            <ClipboardList className="h-4 w-4" />
            Audit Log
          </NavLink>
        </>
      )}
      <NavLink to="/profile" className={linkClass} onClick={() => setMobileMenuOpen(false)}>
        <UserCircle className="h-4 w-4" />
        Profile
      </NavLink>
    </>
  ) : null

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-brand-primary focus:text-white focus:rounded-md">
        Skip to content
      </a>
      <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur-sm">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 font-bold text-brand-primary">
              {logoUrl && (
                <img src={logoUrl} alt="Logo" className="h-8 w-8 object-contain" />
              )}
              <span className="text-base">{universityName}</span>
            </Link>
            {user && (
              <nav className="hidden md:flex items-center gap-0.5 text-sm">
                {navLinks}
              </nav>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={cycleTheme}
              aria-label={`Switch theme, currently ${theme}`}
            >
              <ThemeToggleIcon theme={theme} />
            </Button>
            {user && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-label="Toggle navigation menu"
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-brand-primary text-white text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {user.role.replace('_', ' ').toLowerCase()}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
        {mobileMenuOpen && user && (
          <nav className="md:hidden border-t bg-background animate-fade-in" aria-label="Mobile navigation">
            <div className="container mx-auto px-4 py-3 flex flex-col gap-3 text-sm">
              {navLinks}
            </div>
          </nav>
        )}
      </header>
      <main id="main-content" className="flex-1 container mx-auto px-4 py-6">
        <RouteErrorBoundary>
          <Outlet />
        </RouteErrorBoundary>
      </main>
    </div>
  )
}
