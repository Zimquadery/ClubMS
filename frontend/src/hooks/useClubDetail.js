import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '@/api/client'
import { toast } from 'sonner'

export default function useClubDetail(id, user) {
  const navigate = useNavigate()
  const [club, setClub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [leaveLoading, setLeaveLoading] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newEvent, setNewEvent] = useState({ title: '', description: '', startTime: '', endTime: '', venueId: '', venue: '', bannerUrl: '', invitedClubs: [], tags: [] })
  const [deleteEventTarget, setDeleteEventTarget] = useState(null)
  const [membersPage, setMembersPage] = useState(1)
  const [eventsPage, setEventsPage] = useState(1)
  const [membersSearch, setMembersSearch] = useState('')
  const [debouncedMembersSearch, setDebouncedMembersSearch] = useState('')
  const [membersStatus, setMembersStatus] = useState('ACTIVE')
  const [totalMembers, setTotalMembers] = useState(0)
  const [totalEvents, setTotalEvents] = useState(0)
  const loadedRef = useRef(false)
  const [prevId, setPrevId] = useState(id)

  if (prevId !== id) {
    setPrevId(id)
    loadedRef.current = false
    setClub(null)
    setError('')
    setLoading(true)
    setRefreshing(false)
    setMembersPage(1)
    setEventsPage(1)
    setMembersSearch('')
    setDebouncedMembersSearch('')
    setMembersStatus('ACTIVE')
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMembersSearch(membersSearch)
      setMembersPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [membersSearch])

  function buildParams() {
    const params = { membersPage, membersLimit: 10, eventsPage, eventsLimit: 5 }
    const q = debouncedMembersSearch.trim()
    if (q) params.membersSearch = q
    if (membersStatus === 'ALUMNI') params.membersStatus = membersStatus
    return params
  }

  async function fetchClub(isCancelled = () => false) {
    const isInitial = !loadedRef.current
    if (isInitial) setLoading(true)
    else setRefreshing(true)
    setError('')
    try {
      const res = await client.get(`/clubs/${id}`, { params: buildParams() })
      if (isCancelled()) return
      setClub(res.data)
      setTotalMembers(res.data.totalMembers)
      setTotalEvents(res.data.totalEvents)
      loadedRef.current = true
    } catch (err) {
      if (isCancelled()) return
      if (isInitial) setError(err.response?.data?.message || 'Failed to load club')
      else toast.error(err.response?.data?.message || 'Failed to refresh club details')
    } finally {
      if (!isCancelled()) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }

  useEffect(() => {
    let active = true
    fetchClub(() => !active)
    return () => { active = false }
  }, [id, membersPage, eventsPage, debouncedMembersSearch, membersStatus])

  async function handleJoin() {
    setJoinLoading(true)
    try {
      await client.post(`/clubs/${id}/join`, { agreedToRules: true })
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
      const res = await client.post(`/clubs/${id}/events`, payload)
      setShowCreateDialog(false)
      toast.success('Event created', {
        duration: 6000,
        action: { label: 'View event', onClick: () => navigate(`/events/${res.data.id}`) },
      })
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

  const joinRuleMode = club?.joinRuleMode || 'ALL'
  const joinDepartments = club?.joinDepartments || []
  const userDept = user?.department?.trim().toLowerCase()
  const deptListed = joinDepartments.some((d) => d.trim().toLowerCase() === userDept)
  const joinBlocked = !!club && !!user && joinRuleMode !== 'ALL' && (
    joinRuleMode === 'ALLOW' ? !userDept || !deptListed : !!userDept && deptListed
  )
  const joinBlockedNote = !joinBlocked ? null
    : joinRuleMode === 'ALLOW' && !userDept
      ? { text: 'Add your department in your profile to request joining', linkTo: '/profile' }
      : joinRuleMode === 'ALLOW'
        ? { text: `Only accepting members from ${joinDepartments.join(', ')}` }
        : { text: `Not accepting members from the ${user.department} department` }
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
    club, loading, refreshing, error,
    joinLoading, leaveLoading,
    showCreateDialog, setShowCreateDialog,
    submitting, newEvent, setNewEvent,
    addInvitee, removeInvitee,
    deleteEventTarget, setDeleteEventTarget,
    membersPage, setMembersPage, eventsPage, setEventsPage,
    totalMembers, totalEvents,
    membersSearch, setMembersSearch, membersStatus, setMembersStatus,
    fetchClub, handleJoin, handleLeave, handleCreateEvent, handleDeleteEvent,
    memberCount, userMembership, canManageEvents, canViewMembers,
    joinBlocked, joinBlockedNote,
    members, events, membersTotalPages, eventsTotalPages,
  }
}
