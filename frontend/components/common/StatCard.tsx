import * as React from 'react'
import { cn } from '@/lib/utils'
import { AppCard } from './AppCard'

type StatCardProps = React.ComponentProps<typeof AppCard> & {
  icon?: React.ReactNode
  title: React.ReactNode
  value: React.ReactNode
  trend?: React.ReactNode
}

export function StatCard({
  icon,
  title,
  value,
  trend,
  selected = false,
  className,
  ...props
}: StatCardProps) {
  return (
    <AppCard
      interactive
      selected={selected}
      className={cn('min-w-0 rounded-[var(--radius)] p-5', className)}
      {...props}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        {icon ? <span className="shrink-0 text-2xl">{icon}</span> : <span />}
        {trend}
      </div>
      <h3 className={cn('mb-1 text-sm uppercase', selected ? 'text-white/75' : 'text-muted-foreground')}>
        {title}
      </h3>
      <p
        className={cn(
          'min-w-0 break-words text-center text-[clamp(1rem,1.35vw,1.375rem)] font-bold leading-tight tabular-nums',
          selected ? 'text-white' : 'text-foreground'
        )}
      >
        {value}
      </p>
    </AppCard>
  )
}
