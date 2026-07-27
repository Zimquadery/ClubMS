import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import client from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar, MapPin, Clock, ImageIcon, Filter } from 'lucide-react'
import { formatDate, formatTime } from '@/lib/format'
import { Pagination } from '@/components/Pagination'
import { EventCardSkeleton } from '@/components/ui/skeleton'

export default function EventCalendar() {
  const [searchParams, setSearchParams] = useSearchParams()

  const setURLParam = (key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value === '' || value === null || value === undefined) next.delete(key)
      else next.set(key, String(value))
      return next
    })
  }

  const updateFilter = (key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value === '' || value === null || value === undefined) next.delete(key)
      else next.set(key, String(value))
      next.set('page', '1')
      return next
    })
  }

  const rawPage = parseInt(searchParams.get('page') || '1', 10)
  const page = rawPage >= 1 ? rawPage : 1
  const filterMode = searchParams.get('filterMode') || 'all'
  const clubId = searchParams.get('clubId') || ''
  const venueId = searchParams.get('venueId') || ''
  const timeRange = searchParams.get('timeRange') || 'upcoming'

  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [clubs, setClubs] = useState([])
  const [venues, setVenues] = useState([])
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    let active = true
    async function doFetch() {
      try {
        const res = await client.get('/clubs', { params: { limit: 100 } })
        const data = res.data.items ? res.data.items : res.data
        if (active) setClubs(data)
      } catch {
      }
    }
    doFetch()
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    async function doFetch() {
      try {
        const res = await client.get('/venues', { params: { limit: 100 } })
        const data = res.data.items ? res.data.items : res.data
        if (active) setVenues(data)
      } catch {
      }
    }
    doFetch()
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    async function doFetch() {
      try {
        const params = new URLSearchParams()
        if (filterMode === 'joined') params.set('joined', 'true')
        if (clubId) params.set('clubId', clubId)
        if (venueId) params.set('venueId', venueId)
        params.set('timeRange', timeRange)
        params.set('page', page)
        const res = await client.get(`/events?${params.toString()}`)
        if (active) {
          setEvents(res.data.items)
          setTotalPages(res.data.totalPages)
        }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.message || 'Failed to load events')
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    doFetch()
    return () => { active = false }
  }, [filterMode, clubId, venueId, timeRange, page])

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold">Events</h1>
        <p className="text-sm text-muted-foreground mt-1">Browse events from all clubs</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-5">
        <div className="inline-flex rounded-md border overflow-hidden">
          <Button
            variant={filterMode === 'all' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none"
            onClick={() => updateFilter('filterMode', 'all')}
          >
            All Clubs
          </Button>
          <Button
            variant={filterMode === 'joined' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none"
            onClick={() => updateFilter('filterMode', 'joined')}
          >
            My Clubs
          </Button>
        </div>

        <div className="h-5 w-px bg-border hidden sm:block" />

        <Select value={timeRange} onValueChange={(val) => updateFilter('timeRange', val)}>
          <SelectTrigger className="w-[160px]">
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="past">Past</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>

        <Select value={clubId} onValueChange={(val) => updateFilter('clubId', val === '__all__' ? '' : val)}>
          <SelectTrigger className="w-[220px]">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All Clubs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Clubs</SelectItem>
            {clubs.map((club) => (
              <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={venueId || '__all__'} onValueChange={(val) => updateFilter('venueId', val === '__all__' ? '' : val)}>
          <SelectTrigger className="w-[220px]">
            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All Venues" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Venues</SelectItem>
            <SelectItem value="none">Other / Custom</SelectItem>
            {venues.map((v) => (
              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-8">
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm">
              {timeRange === 'past' ? 'No past events' : timeRange === 'upcoming' ? 'No upcoming events' : 'No events'}
            </p>
          </div>
        )}

        {!loading && !error && events.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <Link key={event.id} to={`/events/${event.id}`}>
                  <Card className="hover:shadow-md transition-shadow h-full overflow-hidden group">
                    {event.bannerUrl && (
                      <div className="h-40 w-full overflow-hidden">
                        <img src={event.bannerUrl} alt={event.title} className="h-full w-full object-cover" />
                      </div>
                    )}
                    <CardContent className="p-4 relative">
                      <div className="absolute -top-5 left-4 h-10 w-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden border-2 border-background shadow-sm">
                        {event.club?.logoUrl ? (
                          <img src={event.club.logoUrl} alt={event.club.name} className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="pt-6">
                        <span className="text-xs text-muted-foreground">
                          {event.club?.name}
                          {event.hosts && event.hosts.length > 1 && (
                            <span className="ml-1 text-brand-primary">+{event.hosts.length - 1}</span>
                          )}
                        </span>
                        <h3 className="text-sm font-medium mt-0.5 group-hover:underline">{event.title}</h3>
                      </div>
                      <div className="mt-2.5 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3 shrink-0" />
                          {formatDate(event.startTime)}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 shrink-0" />
                          {formatTime(event.startTime)} – {formatTime(event.endTime)}
                        </div>
                        {event.venue && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {event.venue}
                          </div>
                        )}
                      </div>
                      {event.description && (
                        <p className="mt-2.5 text-xs text-muted-foreground line-clamp-2">{event.description}</p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={(p) => setURLParam('page', p)} />
          </>
        )}
      </div>
    </div>
  )
}
