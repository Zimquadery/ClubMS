import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollText } from 'lucide-react'

export function JoinAgreementDialog({ open, onOpenChange, rules, submitting, onConfirm }) {
  const [agreed, setAgreed] = useState(false)

  useEffect(() => {
    if (open) setAgreed(false)
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-brand-primary" />
            Club Rules
          </DialogTitle>
          <DialogDescription>
            Please read and agree to the rules before requesting to join.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[40vh] overflow-y-auto rounded-md border border-input bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-wrap">
          {rules}
        </div>

        <label htmlFor="agree-rules" className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            id="agree-rules"
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brand-primary"
          />
          <span>I have read and agree to the club rules</span>
        </label>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            className="bg-brand-primary hover:bg-brand-primary/90 text-white"
            disabled={!agreed || submitting}
            onClick={onConfirm}
          >
            {submitting ? 'Requesting...' : 'Agree & Join'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
