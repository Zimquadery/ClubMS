import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import client from '@/api/client'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Users, Calendar, MapPin, ImageIcon, Clock, UserPlus, Shield, GraduationCap, Trash2 } from 'lucide-react'
import BackLink from '@/components/BackLink'
import { ImageUploadButton } from '@/components/ImageUploadButton'
import { formatDate, formatTime } from '@/lib/format'
import { toast } from 'sonner'
import { DetailSkeleton } from '@/components/ui/skeleton'

export default function ClubDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [club, setClub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [leaveLoading, setLeaveLoading] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newEvent, setNewEvent] = useState({ title: '', description: '', startTime: '', endTime: '', location: '', bannerUrl: '' })
  const [deleteEventTarget, setDeleteEventTarget] = useState(null)

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

  async function handleJoin() {
    setJoinLoading(true)
    try {
      await client.post(`/clubs/${id}/join`)
      await fetchClub()
      toast.success('Join request submitted!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join club')
    } finally {
      setJoinLoading(false)
    }
  }

  async function handleLeave() {
    setLeaveLoading(true)
    try {
      await client.post(`/clubs/${id}/leave`)
      toast.success('You have left the club')
      await fetchClub()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to leave club')
    } finally {
      setLeaveLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <DetailSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <BackLink to="/clubs" label="Back to Directory" />
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
      </div>
    )
  }

  if (!club) return null

  const memberCount = club.memberships?.length ?? 0
  const userMembership = club.userMembership
  const canManageEvents = (userMembership?.role === 'OFFICER' && userMembership?.status === 'ACTIVE') || user?.role === 'PLATFORM_ADMIN'

  const adminButtons = (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => navigate(`/admin/clubs/${id}/requests`)}>
        Pending Requests
      </Button>
      <Button variant="outline" size="sm" onClick={() => navigate(`/admin/clubs/${id}/members`)}>
        Manage Members
      </Button>
    </div>
  )

  async function handleCreateEvent(e) {
    e.preventDefault()
    setSubmitting(true)
    if (newEvent.startTime && newEvent.endTime) {
      const start = new Date(newEvent.startTime)
      const end = new Date(newEvent.endTime)
      if (end <= start) {
        toast.error('End time must be after start time')
        setSubmitting(false)
        return
      }
    }
    try {
      await client.post(`/clubs/${id}/events`, newEvent)
      setShowCreateDialog(false)
      toast.success('Event created!')
      setNewEvent({ title: '', description: '', startTime: '', endTime: '', location: '', bannerUrl: '' })
      await fetchClub()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create event')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteEvent() {
    if (!deleteEventTarget) return
    try {
      await client.delete(`/events/${deleteEventTarget.id}`)
      await fetchClub()
      toast.success('Event deleted')
      setDeleteEventTarget(null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete event')
    }
  }

  function renderMembershipAction() {
    if (!user) return null

    if (userMembership?.status === 'ACTIVE') {
      return (
        <div className="flex items-center gap-2">
          <Badge className="bg-status-green/15 text-status-green">
            <Shield className="h-3 w-3 mr-1" />
            {userMembership.role === 'OFFICER' ? 'Officer' : 'Member'}
          </Badge>
          {userMembership.role === 'OFFICER' || user?.role === 'PLATFORM_ADMIN' ? (
            adminButtons
          ) : user?.role === 'STUDENT' ? (
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" disabled={leaveLoading} onClick={handleLeave}>
              {leaveLoading ? 'Leaving...' : 'Leave Club'}
            </Button>
          ) : null}
        </div>
      )
    }

    if (userMembership?.status === 'PENDING') {
      return (
        <Badge variant="secondary" className="bg-status-yellow/15 text-status-yellow">
          Request Pending
        </Badge>
      )
    }

    if (userMembership?.status === 'ALUMNI') {
      return (
        <Badge variant="secondary" className="bg-brand-primary/10 text-brand-primary">
          <GraduationCap className="h-3 w-3 mr-1" /> Alumni
        </Badge>
      )
    }

    if (userMembership?.status === 'REJECTED') {
      if (user?.role === 'STUDENT') {
        return (
          <Button
            className="bg-brand-primary hover:bg-brand-primary/90 text-white"
            disabled={joinLoading}
            onClick={handleJoin}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {joinLoading ? 'Requesting...' : 'Re-apply'}
          </Button>
        )
      }
      return null
    }

    if (user?.role === 'STUDENT') {
      return (
        <Button
          className="bg-brand-primary hover:bg-brand-primary/90 text-white"
          disabled={joinLoading}
          onClick={handleJoin}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          {joinLoading ? 'Requesting...' : 'Join Club'}
        </Button>
      )
    }

    if (user?.role === 'PLATFORM_ADMIN') {
      return adminButtons
    }

    return null
  }

  return (
    <div className="space-y-6">
      <BackLink to="/clubs" label="Back to Directory" />

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
            <p className="text-sm text-muted-foreground mt-1">{club.description}</p>
          )}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              {memberCount} active member{memberCount !== 1 ? 's' : ''}
            </div>
            {renderMembershipAction()}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-brand-primary" />
                Upcoming Events
              </CardTitle>
              {canManageEvents && (
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-brand-primary hover:bg-brand-primary/90 text-white">
                      Create Event
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Event</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateEvent} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="event-title">Title</Label>
                        <Input id="event-title" required value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="event-description">Description</Label>
                        <Textarea id="event-description" value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="event-start">Start Time</Label>
                        <Input id="event-start" type="datetime-local" required value={newEvent.startTime} onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="event-end">End Time</Label>
                        <Input id="event-end" type="datetime-local" required value={newEvent.endTime} onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="event-location">Location</Label>
                        <Input id="event-location" value={newEvent.location} onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="event-banner">Banner</Label>
                        <div className="flex gap-2">
                          <Input id="event-banner" value={newEvent.bannerUrl} onChange={(e) => setNewEvent({ ...newEvent, bannerUrl: e.target.value })} className="flex-1" />
                          <ImageUploadButton onUploadComplete={(url) => setNewEvent({ ...newEvent, bannerUrl: url })} />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)} disabled={submitting}>Cancel</Button>
                        <Button type="submit" className="bg-brand-primary hover:bg-brand-primary/90 text-white" disabled={submitting}>{submitting ? 'Creating...' : 'Create'}</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!club.events || club.events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming events scheduled.</p>
            ) : (
              <div className="divide-y">
                {club.events.map((event) => (
                  <div key={event.id} className="space-y-1 py-2 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/events/${event.id}`} className="font-medium text-sm hover:underline">{event.title}</Link>
                      {canManageEvents && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0 text-muted-foreground hover:text-destructive" aria-label="Delete event" onClick={() => setDeleteEventTarget(event)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
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
              <div className="divide-y">
                {club.memberships.map((membership) => (
                  <div key={membership.id} className="flex items-center justify-between text-sm py-2 first:pt-0 last:pb-0">
                    <span className="font-medium">{membership.user.name}</span>
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
      <Dialog open={!!deleteEventTarget} onOpenChange={(open) => !open && setDeleteEventTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteEventTarget?.title}&quot;? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteEventTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteEvent}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
