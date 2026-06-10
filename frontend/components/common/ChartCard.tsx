import * as React from 'react'
import { cn } from '@/lib/utils'
import { AppCard } from './AppCard'

type ChartCardProps = React.ComponentProps<'div'>

export function ChartCard({ className, ...props }: ChartCardProps) {
  return (
    <AppCard
      variant="chart"
      className={cn('flex h-full flex-col rounded-[var(--radius)] p-4', className)}
      {...props}
    />
  )
}
