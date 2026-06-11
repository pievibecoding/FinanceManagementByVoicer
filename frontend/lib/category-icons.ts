export type CategoryIconOption = {
  value: string
  glyph: string
  labelKey: string
}

export const CATEGORY_ICON_OPTIONS: CategoryIconOption[] = [
  { value: 'essential', glyph: '🧾', labelKey: 'categoryIcons.essential' },
  { value: 'food', glyph: '🍜', labelKey: 'categoryIcons.food' },
  { value: 'coffee', glyph: '☕', labelKey: 'categoryIcons.coffee' },
  { value: 'shopping', glyph: '🛒', labelKey: 'categoryIcons.shopping' },
  { value: 'home', glyph: '🏠', labelKey: 'categoryIcons.home' },
  { value: 'transport', glyph: '🚗', labelKey: 'categoryIcons.transport' },
  { value: 'utilities', glyph: '💡', labelKey: 'categoryIcons.utilities' },
  { value: 'entertainment', glyph: '🎬', labelKey: 'categoryIcons.entertainment' },
  { value: 'health', glyph: '💊', labelKey: 'categoryIcons.health' },
  { value: 'education', glyph: '📚', labelKey: 'categoryIcons.education' },
  { value: 'work', glyph: '💼', labelKey: 'categoryIcons.work' },
  { value: 'salary', glyph: '💰', labelKey: 'categoryIcons.salary' },
  { value: 'investment', glyph: '📈', labelKey: 'categoryIcons.investment' },
  { value: 'gift', glyph: '🎁', labelKey: 'categoryIcons.gift' },
  { value: 'travel', glyph: '✈️', labelKey: 'categoryIcons.travel' },
  { value: 'other', glyph: '📦', labelKey: 'categoryIcons.other' },
]

const ICON_BY_VALUE = new Map(CATEGORY_ICON_OPTIONS.map((option) => [option.value, option]))
const VALUE_BY_GLYPH = new Map(CATEGORY_ICON_OPTIONS.map((option) => [option.glyph, option.value]))

export const defaultCategoryIcon = 'other'

export function normalizeCategoryIcon(value: string | null | undefined) {
  if (!value) return defaultCategoryIcon
  if (ICON_BY_VALUE.has(value)) return value
  return VALUE_BY_GLYPH.get(value) ?? defaultCategoryIcon
}

export function getCategoryIconGlyph(value: string | null | undefined) {
  return ICON_BY_VALUE.get(normalizeCategoryIcon(value))?.glyph ?? ICON_BY_VALUE.get(defaultCategoryIcon)!.glyph
}
