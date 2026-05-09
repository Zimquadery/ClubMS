import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import client from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Check, X, Users, CheckSquare, XSquare } from 'lucide-react'
import BackLink from '@/components/BackLink'
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
import { Pagination } from '@/components/Pagination'
import { useAdminClubSelector } from '@/hooks/useAdminClubSelector'
import { AdminClubHeader } from '@/components/admin/AdminClubHeader'

export default function PendingRequests() {
  const { clubId, adminClubs, currentClub, adminError, navigateToClub } = useAdminClubSelector((val) => `/admin/clubs/${val}/requests`)
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState({})
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejecting, setRejecting] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  const setURLParam = (key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value === '' || value === null || value === undefined) next.delete(key)
      else next.set(key, String(value))
      return next
    })
  }

  const rawPage = parseInt(searchParams.get('page') || '1', 10)
  const page = rawPage >= 1 ? rawPage : 1
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (!clubId) return
    let active = true
    setLoading(true)
    setError('')
    async function fetchData() {
      try {
        const res = await client.get(`/clubs/${clubId}/members`, { params: { status: 'PENDING', page, limit: 20 } })
        const items = res.data.items || res.data
        if (items.length === 0 && page > 1) {
          if (active) setURLParam('page', String(page - 1))
          return
        }
        if (active) {
          setRequests(items)
          setTotalPages(res.data.totalPages || 1)
        }
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Failed to load requests')
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchData()
    return () => { active = false }
  }, [clubId, page])

  async function fetchRequests() {
    setLoading(true)
    setError('')
    try {
      const res = await client.get(`/clubs/${clubId}/members`, { params: { status: 'PENDING', page, limit: 20 } })
      const items = res.data.items || res.data
      if (items.length === 0 && page > 1) {
        setURLParam('page', String(page - 1))
        return
      }
      setRequests(items)
      setTotalPages(res.data.totalPages || 1)
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

  async function handleBulkAction(action, successVerb, errorContext) {
    if (selected.size === 0) return
    setBulkLoading(true)
    try {
      await client.post(`/clubs/${clubId}/members/bulk-${action}`, { userIds: Array.from(selected) })
      toast.success(`${selected.size} request(s) ${successVerb}`)
      setSelected(new Set())
      await fetchRequests()
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${errorContext}`)
    } finally {
      setBulkLoading(false)
    }
  }

  function handleBulkApprove() {
    handleBulkAction('approve', 'approved', 'bulk approve')
  }

  function handleBulkReject() {
    handleBulkAction('reject', 'rejected', 'bulk reject')
  }

  return (
    <>
    <div className="space-y-6">
      <BackLink to="/admin/clubs" label="Back to Clubs" />

      <AdminClubHeader title="Pending Requests" subtitle="Review membership requests" adminClubs={adminClubs} currentClub={currentClub} clubId={clubId} onClubChange={navigateToClub} />

      {requests.length > 0 && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selected.size === requests.length && requests.length > 0}
            onChange={toggleSelectAll}
            className="h-4 w-4 rounded border-input"
          />
          <span className="text-sm text-muted-foreground">Select all ({requests.length})</span>
        </div>
      )}

      {(adminError || error) && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">{adminError || error}</div>
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
                    className="h-4 w-4 rounded border-input"
                  />
                  <div>
                    <p className="text-sm font-medium">{req.user.name}</p>
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

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={(p) => setURLParam('page', String(p))}
      />
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
