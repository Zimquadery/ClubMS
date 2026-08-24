import { useEffect, useState } from 'react'
import client from '@/api/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { ScrollText, Info } from 'lucide-react'

function LabelWithHint({ htmlFor, children, hint }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{children}</Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`About ${String(children).toLowerCase()}`}
            className="rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>{hint}</TooltipContent>
      </Tooltip>
    </div>
  )
}

export function EditClubProfileDialog({ open, onOpenChange, club, onSaved }) {
  const [description, setDescription] = useState('')
  const [rules, setRules] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setDescription(club?.description || '')
    setRules(club?.rules || '')
    setError('')
  }, [open, club])

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await client.patch(`/clubs/${club.id}/profile`, { description, rules })
      toast.success('Club updated')
      onSaved?.()
      onOpenChange(false)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update club')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <TooltipProvider delayDuration={200}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-brand-primary" />
              Edit Club
            </DialogTitle>
            <DialogDescription className="sr-only">
              Update the club description and rules.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <LabelWithHint htmlFor="club-description" hint="A short intro shown at the top of the club page.">
                Description
              </LabelWithHint>
              <Textarea
                id="club-description"
                rows={4}
                maxLength={1000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief introduction of the club"
              />
            </div>
            <div className="space-y-2">
              <LabelWithHint htmlFor="club-rules" hint="Shown to everyone. Joiners must agree before they can request to join.">
                Rules
              </LabelWithHint>
              <Textarea
                id="club-rules"
                rows={8}
                maxLength={4000}
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                placeholder="Leave empty if the club has no rules"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button className="bg-brand-primary hover:bg-brand-primary/90 text-white" disabled={saving} onClick={handleSave}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  )
}
