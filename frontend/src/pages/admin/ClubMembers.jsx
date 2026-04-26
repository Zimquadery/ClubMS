import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import client from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Users, ArrowLeft, ArrowRightLeft, GraduationCap } from 'lucide-react'

export default function ClubMembers() {
  const { id: clubId } = useParams()
  const navigate = useNavigate()
  const [adminClubs, setAdminClubs] = useState([])
  const [activeMembers, setActiveMembers] = useState([])
  const [alumniMembers, setAlumniMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('active')
  const [transferTarget, setTransferTarget] = useState(null)
  const [transferring, setTransferring] = useState(false)
  const [actionLoading, setActionLoading] = useState({})

  useEffect(() => {
    fetchAdminClubs()
  }, [])

  useEffect(() => {
    if (clubId) fetchMembers()
  }, [clubId])

  async function fetchAdminClubs() {
    try {
      const res = await client.get('/memberships/my-admin-clubs')
      setAdminClubs(res.data)
    } catch {
      setError('Failed to load admin clubs')
    }
  }

  async function fetchMembers() {
    setLoading(true)
    setError('')
    try {
      const [activeRes, alumniRes] = await Promise.all([
        client.get(`/clubs/${clubId}/members`, { params: { status: 'ACTIVE' } }),
        client.get(`/clubs/${clubId}/members`, { params: { status: 'ALUMNI' } }),
      ])
      setActiveMembers(activeRes.data)
      setAlumniMembers(alumniRes.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load members')
    } finally {
      setLoading(false)
    }
  }

  async function handleSetAlumni(userId) {
    setActionLoading((prev) => ({ ...prev, [userId]: true }))
    try {
      await client.patch(`/clubs/${clubId}/members/${userId}/alumni`)
      await fetchMembers()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to set alumni')
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }))
    }
  }

  async function handleTransfer() {
    if (!transferTarget) return
    setTransferring(true)
    try {
      await client.post(`/clubs/${clubId}/transfer`, { newAdminId: transferTarget.userId })
      setTransferTarget(null)
      await fetchMembers()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to transfer admin')
    } finally {
      setTransferring(false)
    }
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const currentClub = adminClubs.find((c) => c.id === clubId)
  const displayMembers = tab === 'active' ? activeMembers : alumniMembers

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Club Members</h1>
          <p className="text-muted-foreground">Manage members and alumni</p>
        </div>
        {adminClubs.length > 1 && (
          <Select value={clubId} onValueChange={(val) => navigate(`/admin/clubs/${val}/members`)}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {adminClubs.map((club) => (
                <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {currentClub && (
        <Badge variant="secondary">{currentClub.name}</Badge>
      )}

      <div className="flex gap-2">
        <Button
          variant={tab === 'active' ? 'default' : 'outline'}
          size="sm"
          className={tab === 'active' ? 'bg-brand-primary hover:bg-brand-primary/90 text-white' : ''}
          onClick={() => setTab('active')}
        >
          Active Members
        </Button>
        <Button
          variant={tab === 'alumni' ? 'default' : 'outline'}
          size="sm"
          className={tab === 'alumni' ? 'bg-brand-primary hover:bg-brand-primary/90 text-white' : ''}
          onClick={() => setTab('alumni')}
        >
          Alumni
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
        </div>
      ) : displayMembers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            No {tab === 'active' ? 'active members' : 'alumni'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayMembers.map((membership) => (
            <Card key={membership.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{membership.user.name}</p>
                    {membership.role === 'OFFICER' && (
                      <Badge variant="outline" className="text-xs">Officer</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{membership.user.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Joined {formatDate(membership.createdAt)}
                  </p>
                </div>
                {tab === 'active' && membership.role !== 'OFFICER' && (
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={actionLoading[membership.userId]}
                      onClick={() => handleSetAlumni(membership.userId)}
                    >
                      <GraduationCap className="h-4 w-4 mr-1" /> Set Alumni
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTransferTarget(membership)}
                    >
                      <ArrowRightLeft className="h-4 w-4 mr-1" /> Transfer Admin
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!transferTarget} onOpenChange={(open) => !open && setTransferTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Admin Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to transfer admin rights for this club to{' '}
              <strong>{transferTarget?.user?.name}</strong>? You will become a regular member.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferTarget(null)} disabled={transferring}>
              Cancel
            </Button>
            <Button
              className="bg-brand-primary hover:bg-brand-primary/90 text-white"
              onClick={handleTransfer}
              disabled={transferring}
            >
              {transferring ? 'Transferring...' : 'Transfer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
