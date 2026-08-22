import { useEffect, useState } from 'react'
import client from '@/api/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Check, X, Users, CheckSquare, XSquare, SlidersHorizontal } from 'lucide-react'
import BackLink from '@/components/BackLink'
import { formatRelativeTime } from '@/lib/format'
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
import { SkeletonReveal } from '@/components/ui/SkeletonReveal'
import { Pagination } from '@/components/Pagination'
import { useAdminClubSelector } from '@/hooks/useAdminClubSelector'
import { AdminClubHeader } from '@/components/admin/AdminClubHeader'
import { IdCardThumb } from '@/components/admin/IdCardThumb'
import { JoinRulesDialog } from '@/components/club/JoinRulesDialog'
import usePaginatedFetch from '@/hooks/usePaginatedFetch'

const EXIT_MS = 200

export default function PendingRequests() {
  const { clubId, adminClubs, currentClub, adminError, navigateToClub } = useAdminClubSelector((val) => `/admin/clubs/${val}/requests`)

  const {
    items: requests, setItems: setRequests,
    loading, error, page, totalPages, total,
    refetch: fetchRequests,
    setURLParam,
  } = usePaginatedFetch({
    fetchFn: async ({ page }) => {
      const res = await client.get(`/clubs/${clubId}/members`, { params: { status: 'PENDING', page, limit: 20 } })
      return { items: res.data.items || res.data, totalPages: res.data.totalPages || 1, total: res.data.total }
    },
    deps: [clubId],
    enabled: !!clubId,
  })

  const [actionLoading, setActionLoading] = useState({})
  const [exiting, setExiting] = useState(() => new Set())
  const [rejectTarget, setRejectTarget] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [joinRule, setJoinRule] = useState(null)
  const [rulesOpen, setRulesOpen] = useState(false)

  useEffect(() => {
    if (!clubId) return
    let active = true
    client.get(`/clubs/${clubId}`)
      .then((res) => {
        if (active) setJoinRule({ joinRuleMode: res.data.joinRuleMode, joinDepartments: res.data.joinDepartments })
      })
      .catch(() => {})
    return () => { active = false }
  }, [clubId])

  function removeRow(userId) {
    setExiting((prev) => new Set(prev).add(userId))
    setTimeout(() => {
      setRequests((prev) => prev.filter((r) => r.userId !== userId))
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
      setExiting((prev) => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
      fetchRequests()
    }, EXIT_MS)
  }

  async function handleAction(userId, action) {
    setActionLoading((prev) => ({ ...prev, [userId]: true }))
    try {
      await client.patch(`/clubs/${clubId}/members/${userId}/${action}`)
      removeRow(userId)
      toast.success(`Request ${action === 'approve' ? 'approved' : 'rejected'}`)
      return true
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} request`)
      return false
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

  const ruleSummary = !joinRule || joinRule.joinRuleMode === 'ALL'
    ? 'Open to everyone'
    : joinRule.joinRuleMode === 'ALLOW'
      ? `${joinRule.joinDepartments.length} department${joinRule.joinDepartments.length !== 1 ? 's' : ''} only`
      : `${joinRule.joinDepartments.length} blocked`

  return (
    <>
    <div className="space-y-6">
      <BackLink to="/admin/clubs" label="Back to Clubs" />

      <AdminClubHeader
        title="Pending Requests"
        subtitle={`Review membership requests${total ? ` · ${total} pending` : ''}`}
        adminClubs={adminClubs}
        currentClub={currentClub}
        clubId={clubId}
        onClubChange={navigateToClub}
        actions={
          <>
            <Badge variant="secondary" className="hidden whitespace-nowrap text-xs font-normal sm:inline-flex">
              {ruleSummary}
            </Badge>
            <Button variant="outline" onClick={() => setRulesOpen(true)}>
              <SlidersHorizontal className="h-4 w-4 mr-1.5" />Join Rules
            </Button>
          </>
        }
      />

      {(adminError || error) && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">{adminError || error}</div>
      )}

      {!loading && requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm font-medium">No pending requests</p>
            <p className="mt-1 text-sm text-muted-foreground">
              When students ask to join {currentClub?.name || 'this club'}, their requests appear here for you to review.
            </p>
          </CardContent>
        </Card>
      ) : (
        <SkeletonReveal isLoading={loading} skeleton={<ListSkeleton rows={5} />}>
          <Card>
            <CardContent className="p-0">
              {requests.length > 0 && (
                <div className="flex items-center gap-2.5 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.size === requests.length && requests.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-input"
                    aria-label="Select all requests"
                  />
                  <span className="text-sm text-muted-foreground">Select all ({requests.length})</span>
                </div>
              )}
              <div className="divide-y border-t">
                {requests.map((req) => {
                  const rowBusy = actionLoading[req.userId] || exiting.has(req.userId)
                  return (
                    <div
                      key={req.id}
                      className={`flex items-center justify-between gap-4 px-4 py-4 ${exiting.has(req.userId) ? 't-row-exit' : ''}`}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selected.has(req.userId)}
                          onChange={() => toggleSelect(req.userId)}
                          className="h-4 w-4 shrink-0 rounded border-input"
                          aria-label={`Select ${req.user.name}`}
                        />
                        <IdCardThumb
                          url={req.user.idCardUrl}
                          name={req.user.name}
                          meta={[req.user.department, `ID ${req.user.studentId}`].filter(Boolean).join(' · ')}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">{req.user.name}</p>
                            {req.user.department && (
                              <span className="whitespace-nowrap text-xs text-muted-foreground">{req.user.department}</span>
                            )}
                          </div>
                          <p className="truncate text-sm text-muted-foreground">{req.user.email}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            ID {req.user.studentId} · {req.user.phone} · Requested {formatRelativeTime(req.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <Button
                          size="sm"
                          className="min-w-[80px] bg-brand-primary hover:bg-brand-primary/90 text-white"
                          disabled={rowBusy}
                          onClick={() => handleAction(req.userId, 'approve')}
                        >
                          <Check className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="min-w-[68px] text-destructive hover:text-destructive"
                          disabled={rowBusy}
                          onClick={() => setRejectTarget(req)}
                        >
                          <X className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </SkeletonReveal>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={(p) => setURLParam('page', String(p))}
      />
    </div>
    {selected.size > 0 && (
      <Card className="sticky bottom-4 border-brand-primary/30">
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
          <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={actionLoading[rejectTarget?.userId]}>Cancel</Button>
          <Button variant="destructive" disabled={actionLoading[rejectTarget?.userId]} onClick={async () => {
            const ok = await handleAction(rejectTarget.userId, 'reject')
            if (ok) setRejectTarget(null)
          }}>
            {actionLoading[rejectTarget?.userId] ? 'Rejecting...' : 'Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <JoinRulesDialog
      open={rulesOpen}
      onOpenChange={setRulesOpen}
      clubId={clubId}
      rule={joinRule}
      onSaved={setJoinRule}
    />
    </>
  )
}
