import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Calendar, Check, Copy, GraduationCap, IdCard, Mail, MapPin, Phone } from 'lucide-react'
import { formatShortDate } from '@/lib/format'

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-3 py-2 first:pt-0 last:pb-0 text-sm">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="w-24 shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate font-medium">{value}</span>
    </div>
  )
}

function copyText(text) {
  const el = document.createElement('textarea')
  el.value = text
  el.setAttribute('readonly', '')
  el.style.position = 'fixed'
  el.style.opacity = '0'
  document.body.appendChild(el)
  el.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  document.body.removeChild(el)
  return ok
}

function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    let ok = false
    try {
      await navigator.clipboard.writeText(value)
      ok = true
    } catch {
      ok = copyText(value)
    }
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0 text-muted-foreground"
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      onClick={handleCopy}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-status-green" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  )
}

function ContactRow({ icon: Icon, label, value, href }) {
  return (
    <div className="flex items-center gap-3 py-2 first:pt-0 last:pb-0 text-sm">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="w-24 shrink-0 text-xs text-muted-foreground">{label}</span>
      <a href={href} className="min-w-0 truncate font-medium hover:underline">
        {value}
      </a>
      <CopyButton value={value} label={label} />
    </div>
  )
}

export default function MemberDetailDialog({ member, onOpenChange }) {
  const user = member?.user
  const hasContact = !!user?.email || !!user?.phone

  return (
    <Dialog open={!!member} onOpenChange={(open) => !open && onOpenChange()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="truncate">{user?.name}</DialogTitle>
          {(member?.role === 'OFFICER' || member?.status === 'ALUMNI') && (
            <div className="mt-1 flex gap-1.5">
              {member?.role === 'OFFICER' && (
                <Badge variant="outline" className="text-xs">Officer</Badge>
              )}
              {member?.status === 'ALUMNI' && (
                <Badge variant="outline" className="bg-brand-primary/10 text-xs text-brand-primary">Alumni</Badge>
              )}
            </div>
          )}
          <DialogDescription className="sr-only">Member information</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="divide-y">
            <InfoRow icon={GraduationCap} label="Department" value={user?.department} />
            <InfoRow icon={MapPin} label="Home District" value={user?.homeDistrict} />
            <InfoRow icon={IdCard} label="Student ID" value={user?.studentId} />
            <InfoRow icon={Calendar} label="Joined" value={member ? formatShortDate(member.createdAt) : null} />
          </div>

          {hasContact && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Contact</p>
              <div className="divide-y">
                {user?.email && <ContactRow icon={Mail} label="Email" value={user.email} href={`mailto:${user.email}`} />}
                {user?.phone && <ContactRow icon={Phone} label="Phone" value={user.phone} href={`tel:${user.phone}`} />}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
