import * as React from 'react'
import { cn } from '@/lib/utils'

type ErrorStateProps = React.ComponentProps<'div'> & {
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
}

export function ErrorState({ title, description, action, className, ...props }: ErrorStateProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius)] border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive',
        className
      )}
      role="alert"
      {...props}
    >
      <p className="font-semibold">{title}</p>
      {description ? <p className="mt-1 text-destructive/80">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}
