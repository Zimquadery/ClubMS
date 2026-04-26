import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import client from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Calendar, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'PLATFORM_ADMIN'
  const isClubAdmin = user?.role === 'CLUB_ADMIN'
  const [adminClubs, setAdminClubs] = useState([])
  const [clubsLoading, setClubsLoading] = useState(false)

  useEffect(() => {
    if (isClubAdmin) {
      setClubsLoading(true)
      client.get('/memberships/my-admin-clubs')
        .then((res) => setAdminClubs(res.data))
        .catch(() => {})
        .finally(() => setClubsLoading(false))
    }
  }, [isClubAdmin])

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
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  You manage the following clubs:
                </p>
                {clubsLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-primary" />
                ) : adminClubs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No clubs assigned yet.</p>
                ) : (
                  <div className="space-y-2">
                    {adminClubs.map((club) => (
                      <div key={club.id} className="flex items-center justify-between rounded-md border bg-background p-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{club.name}</span>
                          <Badge variant="secondary" className="text-xs">{club.category}</Badge>
                        </div>
                        <div className="flex gap-2">
                          <Link
                            to={`/admin/clubs/${club.id}/requests`}
                            className="text-xs text-brand-primary hover:underline"
                          >
                            Requests
                          </Link>
                          <Link
                            to={`/admin/clubs/${club.id}/members`}
                            className="text-xs text-brand-primary hover:underline"
                          >
                            Members
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
