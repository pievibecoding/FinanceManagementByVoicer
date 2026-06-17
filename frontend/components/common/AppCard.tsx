import * as React from 'react'
import { cn } from '@/lib/utils'

type AppCardProps = React.ComponentProps<'div'> & {
  interactive?: boolean
  selected?: boolean
  variant?: 'default' | 'chart' | 'toolbar' | 'form'
}

const variantClass = {
  default: 'app-card',
  chart: 'chart-surface',
  toolbar: 'toolbar-surface',
  form: 'form-surface',
} as const

export function AppCard({
  className,
  interactive = false,
  selected = false,
  variant = 'default',
  ...props
}: AppCardProps) {
  return (
    <div
      data-selected={selected ? 'true' : undefined}
      className={cn(
        variantClass[variant],
        interactive && 'interactive-card cursor-pointer',
        selected && 'selected-card',
        className
      )}
      {...props}
    />
  )
}
