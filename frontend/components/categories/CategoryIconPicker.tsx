import { useTranslation } from 'react-i18next'
import { CATEGORY_ICON_OPTIONS, getCategoryIconGlyph, normalizeCategoryIcon } from '@/lib/category-icons'

interface CategoryIconPickerProps {
  value: string
  onChange: (value: string) => void
}

const SELECT_CLS = 'w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary'

export function CategoryIconPicker({ value, onChange }: CategoryIconPickerProps) {
  const { t } = useTranslation()
  const normalizedValue = normalizeCategoryIcon(value)

  return (
    <div className="grid grid-cols-[48px_minmax(0,1fr)] gap-2">
      <div className="flex h-10 items-center justify-center rounded-lg border border-border bg-muted/30 text-xl">
        {getCategoryIconGlyph(normalizedValue)}
      </div>
      <select value={normalizedValue} onChange={(event) => onChange(event.target.value)} className={SELECT_CLS}>
        {CATEGORY_ICON_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.glyph} {t(option.labelKey)}
          </option>
        ))}
      </select>
    </div>
  )
}
