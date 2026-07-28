import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import client from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Calendar, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDateTime } from '@/lib/format'
import { toast } from 'sonner'
import { Skeleton, ListSkeleton } from '@/components/ui/skeleton'
import { SkeletonReveal } from '@/components/ui/SkeletonReveal'
import { cn } from '@/lib/utils'

function formatStat(n) {
  return typeof n === 'number' ? n.toLocaleString() : n
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function StatItem({ value, label, divided, attention }) {
  const hasValue = Number(value) > 0
  return (
    <span className="whitespace-nowrap text-sm text-muted-foreground">
      {divided && (
        <span className="mx-1.5 text-muted-foreground/40 select-none" aria-hidden="true">·</span>
      )}
      <strong className={cn(
        "font-semibold tabular-nums",
        hasValue ? "text-foreground" : "text-muted-foreground"
      )}>{formatStat(value)}</strong>{' '}
      {label}
      {attention && hasValue && (
        <span
          className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-status-yellow animate-pulse motion-reduce:animate-none"
          aria-label={`${value} pending`}
        />
      )}
    </span>
  )
}

function AdminCard({ isAdmin, adminClubs, clubsLoading }) {
  return (
    <Card className="border-brand-primary/20 bg-brand-primary/5 mt-6">
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
                <SkeletonReveal isLoading={clubsLoading} skeleton={<ListSkeleton rows={2} />}>
                  {adminClubs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No clubs assigned yet.</p>
                  ) : (
                    <div className="divide-y">
                      {adminClubs.map((club) => (
                        <div key={club.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
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
                </SkeletonReveal>
              </div>
            )}
      </CardContent>
    </Card>
  )
}

function UpcomingEventsCard({ events, loading }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-brand-primary" />
          Upcoming Events
        </CardTitle>
      </CardHeader>
      <CardContent>
        <SkeletonReveal isLoading={loading} skeleton={<ListSkeleton rows={3} />}>
          {events.length > 0 ? (
            <div className="space-y-3">
              {events.map((event) => (
                <div key={event.id}>
                  <div className="flex items-center gap-2">
                    <Link to={`/events/${event.id}`} className="text-sm font-medium hover:underline">
                      {event.title}
                    </Link>
                    <Badge variant="secondary" className="text-xs">{event.club?.name}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDateTime(event.startTime)}{event.venue && ` · ${event.venue}`}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No upcoming events. Join a club to see events here.
            </p>
          )}
        </SkeletonReveal>
      </CardContent>
    </Card>
  )
}

function YourClubsCard({ clubs, loading }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-brand-primary" />
          Your Clubs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <SkeletonReveal isLoading={loading} skeleton={<ListSkeleton rows={3} />}>
          {clubs.length > 0 ? (
            <div className="divide-y">
              {clubs.map((club) => (
                <div key={club.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <Link to={`/clubs/${club.id}`} className="text-sm font-medium hover:underline">
                      {club.name}
                    </Link>
                    <Badge variant="secondary" className="text-xs">{club.category}</Badge>
                    {club.membershipStatus === 'PENDING' && (
                      <Badge variant="outline" className="text-xs text-status-yellow border-status-yellow">Pending</Badge>
                    )}
                  </div>
                  {club.announcementCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {club.announcementCount}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              You haven&apos;t joined any clubs yet.{' '}
              <Link to="/clubs" className="font-bold text-brand-primary hover:underline">Browse clubs →</Link>
            </p>
          )}
        </SkeletonReveal>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'PLATFORM_ADMIN'
  const isClubAdmin = user?.role === 'CLUB_ADMIN' || user?.role === 'FACULTY'
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
    <div>
      <h1 className="text-2xl font-bold">
        <span className="font-normal text-muted-foreground">{getGreeting()},</span>{' '}
        <span className="font-display italic text-brand-primary">{user?.name}</span>
      </h1>
      <div className="mt-2 ml-2">
        {statsLoading ? (
          <div className="flex items-center gap-2" aria-hidden="true">
            {Array.from({ length: user?.role === 'STUDENT' ? 2 : 4 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-16" />
            ))}
          </div>
        ) : stats && (
          <div className="flex items-center flex-wrap animate-fade-in" aria-busy={false}>
            {user?.role === 'PLATFORM_ADMIN' && (
              <>
                <StatItem value={stats.totalClubs} label="clubs" />
                <StatItem value={stats.totalUsers} label="users" divided />
                <StatItem value={stats.upcomingEvents} label="events" divided />
                <StatItem value={stats.pendingMemberships} label="pending" divided attention />
              </>
            )}
            {(user?.role === 'CLUB_ADMIN' || user?.role === 'FACULTY') && (
              <>
                <StatItem value={stats.myClubs} label="clubs" />
                <StatItem value={stats.totalMembers} label="members" divided />
                <StatItem value={stats.upcomingEvents} label="events" divided />
                <StatItem value={stats.pendingRequests} label="pending" divided attention />
              </>
            )}
            {user?.role === 'STUDENT' && (
              <>
                <StatItem value={stats.myClubs} label="clubs" />
                <StatItem value={stats.upcomingEvents} label="events" divided />
              </>
            )}
          </div>
        )}
      </div>

      {(isAdmin || isClubAdmin) && (
        <AdminCard isAdmin={isAdmin} adminClubs={adminClubs} clubsLoading={clubsLoading} />
      )}

      <div className="grid gap-4 md:grid-cols-2 mt-6">
        <UpcomingEventsCard events={upcomingEvents} loading={eventsLoading} />
        <YourClubsCard clubs={myClubs} loading={clubsLoading} />
      </div>
    </div>
  )
}
