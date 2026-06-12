import type { Category } from '@/api/categories'
import { getCategoryIconGlyph } from '@/lib/category-icons'
import { categoryColors, defaultCategoryColor } from '@/styles/tokens'

export type CategoryDisplayMeta = {
  id: string
  name: string
  color: string
  icon?: string
}

const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i

export function isValidCategoryColor(color: string | null | undefined): color is string {
  return typeof color === 'string' && HEX_COLOR_RE.test(color.trim())
}

export function fallbackCategoryColor(index = 0) {
  return categoryColors[index % categoryColors.length] ?? defaultCategoryColor
}

function normalizeId(value: string | number | null | undefined) {
  return value == null ? '' : String(value)
}

export function getCategoryDisplayMeta(
  categoryId: string | number | null | undefined,
  categories: Category[],
  fallbackIndex = 0,
  fallbackName?: string
): CategoryDisplayMeta {
  const id = normalizeId(categoryId)
  const category = categories.find((item) => normalizeId(item.category_id) === id)
  return {
    id,
    name: category?.category_name || fallbackName || `#${id}`,
    color: isValidCategoryColor(category?.color) ? category.color : fallbackCategoryColor(fallbackIndex),
    icon: getCategoryIconGlyph(category?.icon),
  }
}

export function getCategoryColorByName(
  categoryName: string,
  categories: Category[],
  fallbackIndex = 0
) {
  const category = categories.find(
    (item) => item.category_name.toLowerCase() === categoryName.toLowerCase()
  )
  return isValidCategoryColor(category?.color) ? category.color : fallbackCategoryColor(fallbackIndex)
}
