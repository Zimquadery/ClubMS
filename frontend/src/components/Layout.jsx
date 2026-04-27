import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
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
import { LayoutDashboard, Users, Calendar, LogOut, Shield, Menu, X, UserCircle } from 'lucide-react'

export function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const universityName = import.meta.env.VITE_UNIVERSITY_NAME || 'ClubMS'
  const logoUrl = import.meta.env.VITE_LOGO_URL
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const linkClass = ({ isActive }) =>
    `flex items-center gap-1 transition-colors ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`

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
        <NavLink to="/admin/clubs" className={linkClass} onClick={() => setMobileMenuOpen(false)}>
          <Shield className="h-4 w-4" />
          Manage Clubs
        </NavLink>
      )}
      <NavLink to="/profile" className={linkClass} onClick={() => setMobileMenuOpen(false)}>
        <UserCircle className="h-4 w-4" />
        Profile
      </NavLink>
    </>
  ) : null

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 font-bold text-brand-primary">
              {logoUrl && (
                <img src={logoUrl} alt="Logo" className="h-8 w-8 object-contain" />
              )}
              <span>{universityName}</span>
            </Link>
            {user && (
              <nav className="hidden md:flex items-center gap-4 text-sm">
                {navLinks}
              </nav>
            )}
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden h-8 w-8"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-label="Toggle navigation menu"
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-brand-primary text-white text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
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
          <nav className="md:hidden border-t bg-background">
            <div className="container mx-auto px-4 py-3 flex flex-col gap-3 text-sm">
              {navLinks}
            </div>
          </nav>
        )}
      </header>
      <main className="flex-1 container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
