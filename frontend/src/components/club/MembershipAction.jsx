import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserPlus, Shield, GraduationCap, Lock } from 'lucide-react'

export default function MembershipAction({ userMembership, user, joinLoading, leaveLoading, onJoin, onLeave, clubId, joinBlocked = false, joinBlockedNote = null }) {
  const navigate = useNavigate()

  if (!user) return null

  const blockedNotice = joinBlocked && joinBlockedNote ? (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Lock className="h-3.5 w-3.5 shrink-0" />
      {joinBlockedNote.linkTo ? (
        <Link to={joinBlockedNote.linkTo} className="underline underline-offset-2 hover:text-foreground">
          {joinBlockedNote.text}
        </Link>
      ) : (
        <span>{joinBlockedNote.text}</span>
      )}
    </div>
  ) : null

  const adminButtons = (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => navigate(`/admin/clubs/${clubId}/requests`)}>
        Pending Requests
      </Button>
      <Button variant="outline" size="sm" onClick={() => navigate(`/admin/clubs/${clubId}/members`)}>
        Manage Members
      </Button>
    </div>
  )

  if (userMembership?.status === 'ACTIVE') {
    return (
      <div className="flex items-center gap-2">
        <Badge className="bg-status-green/15 text-status-green">
          <Shield className="h-3 w-3 mr-1" />
          {userMembership.role === 'OFFICER' ? 'Officer' : 'Member'}
        </Badge>
        {userMembership.role === 'OFFICER' || user?.role === 'PLATFORM_ADMIN' || user?.role === 'FACULTY' ? (
          adminButtons
        ) : user?.role === 'STUDENT' || user?.role === 'FACULTY' ? (
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" disabled={leaveLoading} onClick={onLeave}>
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
    if (joinBlocked) return blockedNotice
    if (user?.role === 'STUDENT' || user?.role === 'FACULTY') {
      return (
        <Button
          className="bg-brand-primary hover:bg-brand-primary/90 text-white"
          disabled={joinLoading}
          onClick={onJoin}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          {joinLoading ? 'Requesting...' : 'Re-apply'}
        </Button>
      )
    }
    return null
  }

  if (user?.role === 'STUDENT' || user?.role === 'FACULTY') {
    if (joinBlocked) return blockedNotice
    return (
      <Button
        className="bg-brand-primary hover:bg-brand-primary/90 text-white"
        disabled={joinLoading}
        onClick={onJoin}
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
