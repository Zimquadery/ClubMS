import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Calendar, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'PLATFORM_ADMIN'
  const isClubAdmin = user?.role === 'CLUB_ADMIN'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user?.name}</h1>
        <p className="text-muted-foreground">
          {user?.role.replace('_', ' ').toLowerCase()} dashboard
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-brand-primary" />
              Your Clubs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You haven&apos;t joined any clubs yet.{' '}
              <Link to="/clubs" className="text-brand-primary hover:underline">Browse clubs →</Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-brand-primary" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No upcoming events. Join a club to see events here.
            </p>
          </CardContent>
        </Card>
      </div>

      {(isAdmin || isClubAdmin) && (
        <Card className="border-brand-primary/20 bg-brand-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-brand-primary" />
              Admin
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isAdmin ? (
              <>
                <p className="text-sm text-muted-foreground">
                  You have platform admin privileges to manage clubs.
                </p>
                <Link to="/admin/clubs" className="inline-flex items-center gap-1 text-sm text-brand-primary hover:underline mt-1">
                  Manage Clubs →
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                You have club admin privileges. Club management features will be available in upcoming phases.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
