import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import client from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Calendar, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDateTime } from '@/lib/format'
import { toast } from 'sonner'
import { Skeleton, ListSkeleton, CardSkeleton } from '@/components/ui/skeleton'

function StatCard({ label, value, icon }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          {icon && <span className="text-muted-foreground">{icon}</span>}
        </div>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'PLATFORM_ADMIN'
  const isClubAdmin = user?.role === 'CLUB_ADMIN'
  const [myClubs, setMyClubs] = useState([])
  const [clubsLoading, setClubsLoading] = useState(true)
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [adminClubs, setAdminClubs] = useState([])
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    client.get('/stats/dashboard')
      .then((res) => setStats(res.data))
      .catch(() => {})
      .finally(() => setStatsLoading(false))
  }, [])

  useEffect(() => {
    client.get('/memberships/my-clubs')
      .then((res) => setMyClubs(res.data))
      .catch(() => toast.error('Failed to load your clubs'))
      .finally(() => setClubsLoading(false))
  }, [])

  useEffect(() => {
    client.get('/events?joined=true&limit=5')
      .then((res) => setUpcomingEvents(res.data.items || res.data))
      .catch(() => toast.error('Failed to load events'))
      .finally(() => setEventsLoading(false))
  }, [])

  useEffect(() => {
    if (isClubAdmin) {
      client.get('/memberships/my-admin-clubs')
        .then((res) => setAdminClubs(res.data))
        .catch(() => toast.error('Failed to load admin clubs'))
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

      {statsLoading ? (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {user?.role === 'PLATFORM_ADMIN' && (
            <>
              <StatCard label="Total Clubs" value={stats.totalClubs} icon={<Users className="h-5 w-5" />} />
              <StatCard label="Total Users" value={stats.totalUsers} icon={<Users className="h-5 w-5" />} />
              <StatCard label="Upcoming Events" value={stats.upcomingEvents} icon={<Calendar className="h-5 w-5" />} />
              <StatCard label="Pending Requests" value={stats.pendingMemberships} icon={<Shield className="h-5 w-5" />} />
            </>
          )}
          {user?.role === 'CLUB_ADMIN' && (
            <>
              <StatCard label="My Clubs" value={stats.myClubs} />
              <StatCard label="Total Members" value={stats.totalMembers} />
              <StatCard label="Upcoming Events" value={stats.upcomingEvents} />
              <StatCard label="Pending Requests" value={stats.pendingRequests} />
            </>
          )}
          {user?.role === 'STUDENT' && (
            <>
              <StatCard label="My Clubs" value={stats.myClubs} />
              <StatCard label="Upcoming Events" value={stats.upcomingEvents} />
            </>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-brand-primary" />
              Your Clubs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clubsLoading ? (
              <ListSkeleton rows={3} />
            ) : myClubs.length > 0 ? (
              <div className="space-y-2">
                {myClubs.map((club) => (
                  <div key={club.id} className="flex items-center justify-between rounded-md border bg-background p-2">
                    <div className="flex items-center gap-2">
                      <Link to={`/clubs/${club.id}`} className="text-sm font-medium hover:underline">
                        {club.name}
                      </Link>
                      <Badge variant="secondary" className="text-xs">{club.category}</Badge>
                      {club.membershipStatus === 'PENDING' && (
                        <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-400">Pending</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                You haven&apos;t joined any clubs yet.{' '}
                <Link to="/clubs" className="text-brand-primary hover:underline">Browse clubs →</Link>
              </p>
            )}
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
            {eventsLoading ? (
              <ListSkeleton rows={3} />
            ) : upcomingEvents.length > 0 ? (
              <div className="space-y-2">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="rounded-md border bg-background p-2">
                    <div className="flex items-center gap-2">
                      <Link to={`/events/${event.id}`} className="text-sm font-medium hover:underline">
                        {event.title}
                      </Link>
                      <Badge variant="secondary" className="text-xs">{event.club?.name}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDateTime(event.startTime)}{event.location && ` · ${event.location}`}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No upcoming events. Join a club to see events here.
              </p>
            )}
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
                  <ListSkeleton rows={2} />
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
