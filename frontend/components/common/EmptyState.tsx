import * as React from 'react'
import { cn } from '@/lib/utils'
import { AppCard } from './AppCard'

type EmptyStateProps = React.ComponentProps<'div'> & {
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <AppCard className={cn('flex items-center justify-center rounded-[var(--radius)] p-6 text-center', className)} {...props}>
      <div className="max-w-md">
        {icon ? <div className="mb-3 flex justify-center text-2xl text-muted-foreground">{icon}</div> : null}
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
      </div>
    </AppCard>
  )
}
