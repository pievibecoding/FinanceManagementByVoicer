import type { Account } from '@/api/dashboard'
import { accountChartColors, categoryColors, defaultAccountColor } from '@/styles/tokens'

const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i

export function isValidAccountColor(color: string | null | undefined): color is string {
  return typeof color === 'string' && HEX_COLOR_RE.test(color.trim())
}

export function fallbackAccountColor(accountType?: string, index = 0) {
  return accountChartColors[accountType ?? ''] ?? categoryColors[index % categoryColors.length] ?? defaultAccountColor
}

export function getAccountDisplayColor(account: Pick<Account, 'account_type' | 'color'>, index = 0) {
  return isValidAccountColor(account.color) ? account.color : fallbackAccountColor(account.account_type, index)
}
