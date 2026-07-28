import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import client from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Users, ArrowRightLeft, GraduationCap, Trash2, Download, ChevronUp, ChevronDown } from 'lucide-react'
import BackLink from '@/components/BackLink'
import { formatShortDate } from '@/lib/format'
import { toast } from 'sonner'
import { downloadBlob } from '@/lib/download'
import { ListSkeleton } from '@/components/ui/skeleton'
import { SkeletonReveal } from '@/components/ui/SkeletonReveal'
import { Pagination } from '@/components/Pagination'
import { useAdminClubSelector } from '@/hooks/useAdminClubSelector'
import { AdminClubHeader } from '@/components/admin/AdminClubHeader'
import usePaginatedFetch from '@/hooks/usePaginatedFetch'

export default function ClubMembers() {
  const { clubId, adminClubs, currentClub, adminError, navigateToClub } = useAdminClubSelector((val) => `/admin/clubs/${val}/members`)
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'active'
  const [activeMembers, setActiveMembers] = useState([])
  const [alumniMembers, setAlumniMembers] = useState([])

  const {
    items: fetchedMembers,
    loading, error, page, totalPages,
    refetch: fetchMembers,
    setURLParam,
  } = usePaginatedFetch({
    fetchFn: async ({ page }) => {
      const status = tab === 'active' ? 'ACTIVE' : 'ALUMNI'
      const res = await client.get(`/clubs/${clubId}/members`, { params: { status, page, limit: 20 } })
      return { items: res.data.items || res.data, totalPages: res.data.totalPages || 1 }
    },
    deps: [clubId, tab],
    enabled: !!clubId,
  })

  useEffect(() => {
    if (tab === 'active') setActiveMembers(fetchedMembers)
    else setAlumniMembers(fetchedMembers)
  }, [fetchedMembers, tab])

  const [transferTarget, setTransferTarget] = useState(null)
  const [transferring, setTransferring] = useState(false)
  const [removeTarget, setRemoveTarget] = useState(null)
  const [removing, setRemoving] = useState(false)
  const [alumniTarget, setAlumniTarget] = useState(null)
  const [settingAlumni, setSettingAlumni] = useState(false)

  async function handleTransfer() {
    if (!transferTarget) return
    setTransferring(true)
    try {
      await client.post(`/clubs/${clubId}/transfer`, { newAdminId: transferTarget.userId })
      setTransferTarget(null)
      toast.success('Admin role transferred')
      await fetchMembers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to transfer admin')
    } finally {
      setTransferring(false)
    }
  }

  async function handleRemove() {
    if (!removeTarget) return
    setRemoving(true)
    try {
      await client.delete(`/clubs/${clubId}/members/${removeTarget.userId}`)
      toast.success('Member removed')
      setRemoveTarget(null)
      await fetchMembers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member')
    } finally {
      setRemoving(false)
    }
  }

  async function handleExport() {
    try {
      const res = await client.get(`/clubs/${clubId}/members/export`, { responseType: 'blob' })
      downloadBlob(res.data, `members-${clubId}.csv`)
      toast.success('Members exported')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to export members')
    }
  }

  async function handleRoleAction(membership, action, successMsg, errorMsg) {
    try {
      await client.patch(`/clubs/${clubId}/members/${membership.userId}/${action}`)
      toast.success(successMsg)
      await fetchMembers()
    } catch (err) {
      toast.error(err.response?.data?.message || errorMsg)
    }
  }

  async function handlePromote(membership) {
    await handleRoleAction(membership, 'promote', `${membership.user.name} promoted to officer`, 'Failed to promote member')
  }

  async function handleDemote(membership) {
    await handleRoleAction(membership, 'demote', `${membership.user.name} demoted to member`, 'Failed to demote member')
  }

  const displayMembers = tab === 'active' ? activeMembers : alumniMembers

  return (
    <div className="space-y-6">
      <BackLink to="/admin/clubs" label="Back to Clubs" />

      <AdminClubHeader title="Club Members" subtitle="Manage members and alumni" adminClubs={adminClubs} currentClub={currentClub} clubId={clubId} onClubChange={navigateToClub} />

      <div className="flex gap-2">
        <Button
          variant={tab === 'active' ? 'default' : 'outline'}
          size="sm"
          className={tab === 'active' ? 'bg-brand-primary hover:bg-brand-primary/90 text-white' : ''}
          onClick={() => setSearchParams({ tab: 'active', page: '1' })}
        >
          Active Members
        </Button>
        <Button
          variant={tab === 'alumni' ? 'default' : 'outline'}
          size="sm"
          className={tab === 'alumni' ? 'bg-brand-primary hover:bg-brand-primary/90 text-white' : ''}
          onClick={() => setSearchParams({ tab: 'alumni', page: '1' })}
        >
          Alumni
        </Button>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      {(adminError || error) && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">{adminError || error}</div>
      )}

      {!loading && displayMembers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            No {tab === 'active' ? 'active members' : 'alumni'}
          </CardContent>
        </Card>
      ) : (
        <SkeletonReveal isLoading={loading} skeleton={<ListSkeleton rows={5} />}>
        <div className="space-y-3">
          {displayMembers.map((membership) => (
            <Card key={membership.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{membership.user.name}</p>
                    {membership.role === 'OFFICER' && (
                      <Badge variant="outline" className="text-xs">Officer</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{membership.user.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Joined {formatShortDate(membership.createdAt)}
                  </p>
                </div>
                {tab === 'active' && (
                  <div className="flex gap-2 ml-4">
                    {membership.role !== 'OFFICER' && (
                      <Button variant="outline" size="sm" onClick={() => handlePromote(membership)}>
                        <ChevronUp className="h-4 w-4 mr-1" /> Promote
                      </Button>
                    )}
                    {membership.role === 'OFFICER' && (
                      <Button variant="outline" size="sm" onClick={() => handleDemote(membership)}>
                        <ChevronDown className="h-4 w-4 mr-1" /> Demote
                      </Button>
                    )}
                    {membership.role !== 'OFFICER' && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => setAlumniTarget(membership)}>
                          <GraduationCap className="h-4 w-4 mr-1" /> Set Alumni
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setTransferTarget(membership)}>
                          <ArrowRightLeft className="h-4 w-4 mr-1" /> Transfer Admin
                        </Button>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setRemoveTarget(membership)}>
                          <Trash2 className="h-4 w-4 mr-1" /> Remove
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        </SkeletonReveal>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={(p) => setURLParam('page', String(p))}
      />

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

      <Dialog open={!!alumniTarget} onOpenChange={(open) => !open && setAlumniTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Member as Alumni</DialogTitle>
            <DialogDescription>
              Are you sure you want to set <strong>{alumniTarget?.user?.name}</strong> as alumni? They will no longer be an active member.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlumniTarget(null)} disabled={settingAlumni}>Cancel</Button>
            <Button
              className="bg-brand-primary hover:bg-brand-primary/90 text-white"
              onClick={async () => {
                setSettingAlumni(true)
                try {
                  await client.patch(`/clubs/${clubId}/members/${alumniTarget.userId}/alumni`)
                  toast.success('Member set to alumni')
                  setAlumniTarget(null)
                  await fetchMembers()
                } catch (err) {
                  toast.error(err.response?.data?.message || 'Failed to set alumni')
                } finally {
                  setSettingAlumni(false)
                }
              }}
              disabled={settingAlumni}
            >
              {settingAlumni ? 'Setting...' : 'Set Alumni'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{removeTarget?.user?.name}</strong> from this club? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)} disabled={removing}>Cancel</Button>
            <Button variant="destructive" onClick={handleRemove} disabled={removing}>
              {removing ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
