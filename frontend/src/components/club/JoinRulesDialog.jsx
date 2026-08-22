import { useEffect, useState } from 'react'
import client from '@/api/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TagInput } from '@/components/event/TagInput'
import { SlidersHorizontal } from 'lucide-react'

const MODES = [
  { value: 'ALL', label: 'Anyone can join' },
  { value: 'ALLOW', label: 'Only these departments can join' },
  { value: 'BLOCK', label: 'These departments cannot join' },
]

const HINTS = {
  ALLOW: 'Only members of these departments can send a join request.',
  BLOCK: 'Members of these departments cannot send a join request.',
}

export function JoinRulesDialog({ open, onOpenChange, clubId, rule, onSaved }) {
  const [mode, setMode] = useState('ALL')
  const [departments, setDepartments] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setMode(rule?.joinRuleMode || 'ALL')
    setDepartments(rule?.joinDepartments || [])
    setError('')
    let active = true
    client.get('/departments')
      .then((res) => { if (active) setSuggestions(res.data.items || []) })
      .catch(() => {})
    return () => { active = false }
  }, [open, rule])

  function addDepartment(department) {
    setDepartments((prev) => (
      prev.length >= 10 || prev.some((d) => d.toLowerCase() === department.toLowerCase())
        ? prev
        : [...prev, department]
    ))
  }

  async function handleSave() {
    if (mode !== 'ALL' && departments.length === 0) {
      setError('Select at least one department')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await client.patch(`/clubs/${clubId}/join-rules`, {
        joinRuleMode: mode,
        joinDepartments: mode === 'ALL' ? [] : departments,
      })
      toast.success('Join rules updated')
      onSaved?.({ joinRuleMode: res.data.joinRuleMode, joinDepartments: res.data.joinDepartments })
      onOpenChange(false)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update join rules')
    } finally {
      setSaving(false)
    }
  }

  const quickAdd = suggestions.filter(
    (s) => !departments.some((d) => d.toLowerCase() === s.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-brand-primary" />
            Join Rules
          </DialogTitle>
          <DialogDescription>
            Control who can send a join request to this club. Existing requests are not affected.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Who can request to join</Label>
            <Select value={mode} onValueChange={(v) => { setMode(v); setError('') }}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mode !== 'ALL' && (
            <div className="space-y-3">
              <TagInput
                value={departments}
                onChange={setDepartments}
                idPrefix="join-rule-departments"
                label="Departments"
                normalize={(s) => s.trim()}
                hint={HINTS[mode]}
                placeholder="Type a department and press Enter"
                maxLength={100}
              />
              {quickAdd.length > 0 && departments.length < 10 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Quick add:</span>
                  {quickAdd.map((s) => (
                    <button key={s} type="button" onClick={() => addDepartment(s)}>
                      <Badge variant="secondary" className="cursor-pointer transition hover:bg-accent">
                        + {s}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

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
      </DialogContent>
    </Dialog>
  )
}
