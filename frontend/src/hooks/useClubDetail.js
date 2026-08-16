import { useState, useEffect } from 'react'
import client from '@/api/client'
import { toast } from 'sonner'

export default function useClubDetail(id, user) {
  const [club, setClub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [leaveLoading, setLeaveLoading] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newEvent, setNewEvent] = useState({ title: '', description: '', startTime: '', endTime: '', venueId: '', venue: '', bannerUrl: '', invitedClubs: [], tags: [] })
  const [deleteEventTarget, setDeleteEventTarget] = useState(null)
  const [membersPage, setMembersPage] = useState(1)
  const [eventsPage, setEventsPage] = useState(1)
  const [totalMembers, setTotalMembers] = useState(0)
  const [totalEvents, setTotalEvents] = useState(0)

  async function fetchClub() {
    setLoading(true)
    setError('')
    try {
      const res = await client.get(`/clubs/${id}`, {
        params: {
          membersPage,
          membersLimit: 10,
          eventsPage,
          eventsLimit: 5,
        },
      })
      setClub(res.data)
      setTotalMembers(res.data.totalMembers)
      setTotalEvents(res.data.totalEvents)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load club')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    async function doFetch() {
      setLoading(true)
      setError('')
      try {
        const res = await client.get(`/clubs/${id}`, {
          params: {
            membersPage,
            membersLimit: 10,
            eventsPage,
            eventsLimit: 5,
          },
        })
        if (active) {
          setClub(res.data)
          setTotalMembers(res.data.totalMembers)
          setTotalEvents(res.data.totalEvents)
        }
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Failed to load club')
      } finally {
        if (active) setLoading(false)
      }
    }
    doFetch()
    return () => { active = false }
  }, [id, membersPage, eventsPage])

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
      const { venueId, venue, invitedClubs, tags, ...rest } = newEvent
      const payload = venueId ? { ...rest, venueId } : { ...rest, venue }
      if (invitedClubs.length > 0) payload.inviteClubIds = invitedClubs.map((c) => c.id)
      if (tags.length > 0) payload.tags = tags
      await client.post(`/clubs/${id}/events`, payload)
      setShowCreateDialog(false)
      toast.success('Event created!')
      setNewEvent({ title: '', description: '', startTime: '', endTime: '', venueId: '', venue: '', bannerUrl: '', invitedClubs: [], tags: [] })
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

  const memberCount = club?._count?.memberships ?? totalMembers
  const userMembership = club?.userMembership
  const canManageEvents = (userMembership?.role === 'OFFICER' && userMembership?.status === 'ACTIVE') || user?.role === 'PLATFORM_ADMIN' || user?.role === 'FACULTY'
  const canViewMembers = userMembership?.status === 'ACTIVE' || user?.role === 'PLATFORM_ADMIN' || user?.role === 'FACULTY'
  const members = club?.memberships || []
  const events = club?.events || []
  const membersTotalPages = Math.ceil(totalMembers / 10) || 1
  const eventsTotalPages = Math.ceil(totalEvents / 5) || 1

  function addInvitee(club) {
    setNewEvent((prev) => prev.invitedClubs.some((c) => c.id === club.id)
      ? prev
      : { ...prev, invitedClubs: [...prev.invitedClubs, club] })
  }

  function removeInvitee(clubId) {
    setNewEvent((prev) => ({ ...prev, invitedClubs: prev.invitedClubs.filter((c) => c.id !== clubId) }))
  }

  return {
    club, loading, error,
    joinLoading, leaveLoading,
    showCreateDialog, setShowCreateDialog,
    submitting, newEvent, setNewEvent,
    addInvitee, removeInvitee,
    deleteEventTarget, setDeleteEventTarget,
    membersPage, setMembersPage, eventsPage, setEventsPage,
    totalMembers, totalEvents,
    fetchClub, handleJoin, handleLeave, handleCreateEvent, handleDeleteEvent,
    memberCount, userMembership, canManageEvents, canViewMembers,
    members, events, membersTotalPages, eventsTotalPages,
  }
}
