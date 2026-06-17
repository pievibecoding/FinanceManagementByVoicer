import type React from 'react'
import { AppCard } from './AppCard'
import { defaultCategoryColor } from '@/styles/tokens'
import { isValidCategoryColor } from '@/lib/category-display'

interface CategoryAccentCardProps {
  color?: string
  icon: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  children?: React.ReactNode
  onClick?: () => void
  className?: string
}

export function CategoryAccentCard({
  color,
  icon,
  title,
  subtitle,
  actions,
  children,
  onClick,
  className = '',
}: CategoryAccentCardProps) {
  const accentColor = isValidCategoryColor(color) ? color : defaultCategoryColor

  return (
    <AppCard
      interactive={Boolean(onClick)}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`rounded-[var(--radius)] border-l-4 p-4 transition-colors ${className}`}
      style={{ borderLeftColor: accentColor }}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl"
            style={{
              backgroundColor: accentColor,
              boxShadow: `0 0 0 3px ${accentColor}33`,
            }}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-foreground">{title}</h3>
            {subtitle ? <p className="text-sm capitalize text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
      </div>
      {children}
    </AppCard>
  )
}
