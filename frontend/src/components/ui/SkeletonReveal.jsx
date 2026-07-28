import { useLayoutEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export function SkeletonReveal({ isLoading, skeleton, children, className }) {
  const [revealed, setRevealed] = useState(!isLoading)

  useLayoutEffect(() => {
    setRevealed(!isLoading)
  }, [isLoading])

  return (
    <div className={cn('t-skel', revealed && 'is-revealed', className)}>
      <div className={cn('t-skel-skeleton', !revealed && 'is-pulsing')}>
        {skeleton}
      </div>
      <div className="t-skel-content">
        {children}
      </div>
    </div>
  )
}
