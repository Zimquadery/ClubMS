import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import client from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Users, ArrowRightLeft, GraduationCap, Trash2, Download, ChevronUp, ChevronDown, Search, Pencil } from 'lucide-react'
import BackLink from '@/components/BackLink'
import { formatShortDate } from '@/lib/format'
import { toast } from 'sonner'
import { downloadBlob } from '@/lib/download'
import { ListSkeleton } from '@/components/ui/skeleton'
import { SkeletonReveal } from '@/components/ui/SkeletonReveal'
import { Pagination } from '@/components/Pagination'
import { useAdminClubSelector } from '@/hooks/useAdminClubSelector'
import { AdminClubHeader } from '@/components/admin/AdminClubHeader'
import { IdCardThumb } from '@/components/admin/IdCardThumb'
import usePaginatedFetch from '@/hooks/usePaginatedFetch'

export default function ClubMembers() {
  const { clubId, adminClubs, currentClub, adminError, navigateToClub } = useAdminClubSelector((val) => `/admin/clubs/${val}/members`)
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'active'
  const [activeMembers, setActiveMembers] = useState([])
  const [alumniMembers, setAlumniMembers] = useState([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const {
    items: fetchedMembers,
    loading, error, page, totalPages, total,
    refetch: fetchMembers,
    setURLParam,
  } = usePaginatedFetch({
    fetchFn: async ({ page }) => {
      const status = tab === 'active' ? 'ACTIVE' : 'ALUMNI'
      const params = { status, page, limit: 20 }
      const q = debouncedSearch.trim()
      if (q) params.search = q
      const res = await client.get(`/clubs/${clubId}/members`, { params })
      return { items: res.data.items || res.data, totalPages: res.data.totalPages || 1, total: res.data.total }
    },
    deps: [clubId, tab, debouncedSearch],
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
  const [positionTarget, setPositionTarget] = useState(null)
  const [position, setPosition] = useState('')
  const [savingPosition, setSavingPosition] = useState(false)

  function openPositionEditor(membership) {
    setPositionTarget(membership)
    setPosition(membership.position || '')
  }

  async function handlePositionSave() {
    setSavingPosition(true)
    try {
      await client.patch(`/clubs/${clubId}/members/${positionTarget.userId}/position`, { position })
      toast.success('Position updated')
      setPositionTarget(null)
      await fetchMembers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update position')
    } finally {
      setSavingPosition(false)
    }
  }

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

      <AdminClubHeader
        title="Club Members"
        subtitle={`Manage members and alumni${total ? ` · ${total} ${tab === 'active' ? 'active' : 'alumni'}` : ''}`}
        adminClubs={adminClubs}
        currentClub={currentClub}
        clubId={clubId}
        onClubChange={navigateToClub}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" aria-label="Member type" className="flex gap-2">
          <Button
            role="tab"
            aria-selected={tab === 'active'}
            variant={tab === 'active' ? 'default' : 'outline'}
            size="sm"
            className={tab === 'active' ? 'bg-brand-primary hover:bg-brand-primary/90 text-white' : ''}
            onClick={() => setSearchParams({ tab: 'active', page: '1' })}
          >
            Active Members
          </Button>
          <Button
            role="tab"
            aria-selected={tab === 'alumni'}
            variant={tab === 'alumni' ? 'default' : 'outline'}
            size="sm"
            className={tab === 'alumni' ? 'bg-brand-primary hover:bg-brand-primary/90 text-white' : ''}
            onClick={() => setSearchParams({ tab: 'alumni', page: '1' })}
          >
            Alumni
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, email, phone, ID, department, or district"
              aria-label="Search members by name, email, phone, student ID, department, or district"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                if (page > 1) setURLParam('page', '1')
              }}
              maxLength={25}
              className="pl-8 w-48"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {(adminError || error) && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">{adminError || error}</div>
      )}

      {!loading && displayMembers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm font-medium">
              {debouncedSearch ? 'No matches found' : tab === 'active' ? 'No active members yet' : 'No alumni yet'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {debouncedSearch
                ? 'Try a different name, email, phone, ID, department, or district.'
                : tab === 'active'
                  ? 'Members you approve from pending requests will appear here.'
                  : 'Members you set as alumni will appear here.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <SkeletonReveal isLoading={loading} skeleton={<ListSkeleton rows={5} />}>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {displayMembers.map((membership) => (
                  <div key={membership.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <IdCardThumb
                        url={membership.user.idCardUrl}
                        name={membership.user.name}
                        meta={[membership.user.department, membership.user.homeDistrict, `ID ${membership.user.studentId}`].filter(Boolean).join(' · ')}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">{membership.user.name}</p>
                          {membership.role === 'OFFICER' && (
                            <Badge variant="outline" className="text-xs">Officer</Badge>
                          )}
                        </div>
                        <p className="truncate text-sm text-muted-foreground">{membership.user.email}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[membership.user.department, membership.user.homeDistrict, `${membership.user.phone} · ID ${membership.user.studentId}`].filter(Boolean).join(' · ')}
                        </p>
                        {membership.position && <p className="truncate text-xs font-medium text-brand-primary">{membership.position}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          Joined {formatShortDate(membership.createdAt)}
                        </p>
                      </div>
                    </div>
                    {tab === 'active' && (
                      <div className="flex shrink-0 flex-wrap gap-1.5">
                        <Button variant="ghost" size="sm" className="min-w-[92px]" onClick={() => openPositionEditor(membership)}>
                          <Pencil className="h-4 w-4 mr-1" /> Position
                        </Button>
                        {membership.role !== 'OFFICER' && (
                          <Button variant="ghost" size="sm" className="min-w-[84px]" onClick={() => handlePromote(membership)}>
                            <ChevronUp className="h-4 w-4 mr-1" /> Promote
                          </Button>
                        )}
                        {membership.role === 'OFFICER' && (
                          <Button variant="ghost" size="sm" className="min-w-[84px]" onClick={() => handleDemote(membership)}>
                            <ChevronDown className="h-4 w-4 mr-1" /> Demote
                          </Button>
                        )}
                        {membership.role !== 'OFFICER' && (
                          <>
                            <Button variant="ghost" size="sm" className="min-w-[92px]" onClick={() => setAlumniTarget(membership)}>
                              <GraduationCap className="h-4 w-4 mr-1" /> Set Alumni
                            </Button>
                            <Button variant="ghost" size="sm" className="min-w-[118px]" onClick={() => setTransferTarget(membership)}>
                              <ArrowRightLeft className="h-4 w-4 mr-1" /> Transfer Admin
                            </Button>
                            <Button variant="ghost" size="sm" className="min-w-[84px] text-destructive hover:text-destructive" onClick={() => setRemoveTarget(membership)}>
                              <Trash2 className="h-4 w-4 mr-1" /> Remove
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
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
      <Dialog open={!!positionTarget} onOpenChange={(open) => !open && setPositionTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Member Position</DialogTitle>
            <DialogDescription>Set the position for <strong>{positionTarget?.user?.name}</strong> in {currentClub?.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="edit-member-position">Position</Label>
            <Input id="edit-member-position" value={position} onChange={(e) => setPosition(e.target.value)} maxLength={100} placeholder="Leave empty to clear" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPositionTarget(null)} disabled={savingPosition}>Cancel</Button>
            <Button className="bg-brand-primary hover:bg-brand-primary/90 text-white" onClick={handlePositionSave} disabled={savingPosition}>{savingPosition ? 'Saving...' : 'Save Position'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
