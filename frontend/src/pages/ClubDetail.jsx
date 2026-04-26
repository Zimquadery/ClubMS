import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import client from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Calendar, MapPin, ArrowLeft, ImageIcon, Clock } from 'lucide-react'

export default function ClubDetail() {
  const { id } = useParams()
  const [club, setClub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchClub()
  }, [id])

  async function fetchClub() {
    setLoading(true)
    setError('')
    try {
      const res = await client.get(`/clubs/${id}`)
      setClub(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load club')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link to="/clubs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Directory
        </Link>
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
      </div>
    )
  }

  if (!club) return null

  const memberCount = club.memberships?.length ?? 0

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  function formatTime(dateStr) {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      <Link to="/clubs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Directory
      </Link>

      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <div className="flex-shrink-0 h-16 w-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
          {club.logoUrl ? (
            <img src={club.logoUrl} alt={club.name} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{club.name}</h1>
            <Badge variant="secondary">{club.category}</Badge>
          </div>
          {club.description && (
            <p className="text-muted-foreground mt-1">{club.description}</p>
          )}
          <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {memberCount} active member{memberCount !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-brand-primary" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!club.events || club.events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming events scheduled.</p>
            ) : (
              <div className="space-y-3">
                {club.events.map((event) => (
                  <div key={event.id} className="rounded-lg border p-3 space-y-1">
                    <h4 className="font-medium text-sm">{event.title}</h4>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(event.startTime)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(event.startTime)}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </span>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-brand-primary" />
              Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!club.memberships || club.memberships.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active members yet.</p>
            ) : (
              <div className="space-y-2">
                {club.memberships.map((membership) => (
                  <div key={membership.id} className="flex items-center justify-between text-sm">
                    <span>{membership.user.name}</span>
                    {membership.role === 'OFFICER' && (
                      <Badge variant="outline" className="text-xs">Officer</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
