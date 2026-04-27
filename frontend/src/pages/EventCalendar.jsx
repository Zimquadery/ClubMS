import { useState, useEffect } from 'react'
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

export default function EventCalendar() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterMode, setFilterMode] = useState('all')
  const [clubId, setClubId] = useState('')
  const [clubs, setClubs] = useState([])

  useEffect(() => {
    async function fetchClubs() {
      try {
        const res = await client.get('/clubs')
        setClubs(res.data)
      } catch {
        // non-critical: club filter dropdown will be empty
      }
    }
    fetchClubs()
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [filterMode, clubId])

  async function fetchEvents() {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (filterMode === 'joined') params.set('joined', 'true')
      if (clubId) params.set('clubId', clubId)
      const res = await client.get(`/events?${params.toString()}`)
      setEvents(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Events</h1>
        <p className="text-muted-foreground">Upcoming events from your clubs</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex rounded-md border overflow-hidden">
          <Button
            variant={filterMode === 'all' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none"
            onClick={() => setFilterMode('all')}
          >
            All Clubs
          </Button>
          <Button
            variant={filterMode === 'joined' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none"
            onClick={() => setFilterMode('joined')}
          >
            My Clubs
          </Button>
        </div>

        <Select value={clubId} onValueChange={(val) => setClubId(val === '__all__' ? '' : val)}>
          <SelectTrigger className="w-full sm:w-[220px]">
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
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No upcoming events
        </div>
      )}

      {!loading && !error && events.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Card key={event.id} className="hover:shadow-md transition-shadow h-full overflow-hidden">
              {event.bannerUrl && (
                <div className="h-40 w-full overflow-hidden">
                  <img src={event.bannerUrl} alt={event.title} className="h-full w-full object-cover" />
                </div>
              )}
              <CardContent className="p-4 pt-5 relative">
                <div className="absolute -top-5 left-4 h-10 w-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden border-2 border-background shadow-sm">
                  {event.club?.logoUrl ? (
                    <img src={event.club.logoUrl} alt={event.club.name} className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="mb-1 pt-2">
                  <span className="text-xs text-muted-foreground">{event.club?.name}</span>
                </div>
                <h3 className="font-medium">{event.title}</h3>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {formatDate(event.startTime)}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatTime(event.startTime)} – {formatTime(event.endTime)}
                </div>
                {event.location && (
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {event.location}
                  </div>
                )}
                {event.description && (
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{event.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
