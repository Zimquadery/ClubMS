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
import { Check, X, Users, ArrowLeft, Download, CheckSquare, XSquare } from 'lucide-react'
import { formatShortDate } from '@/lib/format'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ListSkeleton } from '@/components/ui/skeleton'

export default function PendingRequests() {
  const { id: clubId } = useParams()
  const navigate = useNavigate()
  const [adminClubs, setAdminClubs] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState({})
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejecting, setRejecting] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  useEffect(() => {
    fetchAdminClubs()
  }, [])

  useEffect(() => {
    if (clubId) fetchRequests()
  }, [clubId])

  async function fetchAdminClubs() {
    try {
      const res = await client.get('/memberships/my-admin-clubs')
      setAdminClubs(res.data)
    } catch {
      setError('Failed to load admin clubs')
    }
  }

  async function fetchRequests() {
    setLoading(true)
    setError('')
    try {
      const res = await client.get(`/clubs/${clubId}/members`, { params: { status: 'PENDING', limit: 100 } })
      setRequests(res.data.items || res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  async function handleAction(userId, action) {
    setActionLoading((prev) => ({ ...prev, [userId]: true }))
    try {
      await client.patch(`/clubs/${clubId}/members/${userId}/${action}`)
      setRequests((prev) => prev.filter((r) => r.userId !== userId))
      toast.success(`Request ${action === 'approve' ? 'approved' : 'rejected'}`)
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} request`)
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }))
    }
  }

  const currentClub = adminClubs.find((c) => c.id === clubId)

  function toggleSelect(userId) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === requests.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(requests.map((r) => r.userId)))
    }
  }

  async function handleBulkApprove() {
    if (selected.size === 0) return
    setBulkLoading(true)
    try {
      await client.post(`/clubs/${clubId}/members/bulk-approve`, { userIds: Array.from(selected) })
      toast.success(`${selected.size} request(s) approved`)
      setSelected(new Set())
      await fetchRequests()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to bulk approve')
    } finally {
      setBulkLoading(false)
    }
  }

  async function handleBulkReject() {
    if (selected.size === 0) return
    setBulkLoading(true)
    try {
      await client.post(`/clubs/${clubId}/members/bulk-reject`, { userIds: Array.from(selected) })
      toast.success(`${selected.size} request(s) rejected`)
      setSelected(new Set())
      await fetchRequests()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to bulk reject')
    } finally {
      setBulkLoading(false)
    }
  }

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Pending Requests</h1>
          <p className="text-muted-foreground">Review membership requests</p>
        </div>
        {adminClubs.length > 1 && (
          <Select value={clubId} onValueChange={(val) => navigate(`/admin/clubs/${val}/requests`)}>
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

      {requests.length > 0 && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selected.size === requests.length && requests.length > 0}
            onChange={toggleSelectAll}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span className="text-sm text-muted-foreground">Select all ({requests.length})</span>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
      )}

      {loading ? (
        <ListSkeleton rows={5} />
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            No pending requests
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Card key={req.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(req.userId)}
                    onChange={() => toggleSelect(req.userId)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <div>
                    <p className="font-medium">{req.user.name}</p>
                    <p className="text-sm text-muted-foreground">{req.user.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Requested {formatShortDate(req.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-brand-primary hover:bg-brand-primary/90 text-white"
                    disabled={actionLoading[req.userId]}
                    onClick={() => handleAction(req.userId, 'approve')}
                  >
                    <Check className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={actionLoading[req.userId]}
                    onClick={() => setRejectTarget(req)}
                  >
                    <X className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    {selected.size > 0 && (
      <Card className="sticky bottom-4 border-brand-primary">
        <CardContent className="p-3 flex items-center justify-between">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-brand-primary hover:bg-brand-primary/90 text-white"
              disabled={bulkLoading}
              onClick={handleBulkApprove}
            >
              <CheckSquare className="h-4 w-4 mr-1" /> Bulk Approve
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={bulkLoading}
              onClick={handleBulkReject}
            >
              <XSquare className="h-4 w-4 mr-1" /> Bulk Reject
            </Button>
          </div>
        </CardContent>
      </Card>
    )}
    <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Membership Request</DialogTitle>
          <DialogDescription>
            Are you sure you want to reject <strong>{rejectTarget?.user?.name}</strong>&apos;s request to join this club?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={rejecting}>Cancel</Button>
          <Button variant="destructive" onClick={async () => {
            setRejecting(true)
            try {
              await client.patch(`/clubs/${clubId}/members/${rejectTarget.userId}/reject`)
              setRequests((prev) => prev.filter((r) => r.userId !== rejectTarget.userId))
              toast.success('Request rejected')
              setRejectTarget(null)
            } catch (err) {
              toast.error(err.response?.data?.message || 'Failed to reject request')
            } finally {
              setRejecting(false)
            }
          }} disabled={rejecting}>
            {rejecting ? 'Rejecting...' : 'Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
