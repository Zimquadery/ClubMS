import { useState } from 'react'
import { getInitials } from '@/lib/initials'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function IdCardThumb({ url, name, meta }) {
  const [open, setOpen] = useState(false)

  if (!url) {
    return (
      <div
        aria-hidden="true"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground"
      >
        {getInitials(name)}
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View ${name}'s ID card`}
        className="group relative img-outline h-11 w-11 shrink-0 overflow-hidden rounded-lg transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <img
          src={url}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-200 ease-out-quart group-hover:scale-105"
        />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{name}</DialogTitle>
            {meta && <DialogDescription>{meta}</DialogDescription>}
          </DialogHeader>
          <div className="relative img-outline overflow-hidden rounded-lg">
            <img src={url} alt={`${name}'s ID card`} className="h-auto w-full object-contain" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
