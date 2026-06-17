/**
 * Design tokens — single source of truth cho tất cả màu sắc dùng trong JS/TSX.
 *
 * CSS variables (Tailwind utilities như text-primary, bg-destructive...) được
 * định nghĩa trong theme.css và không cần khai báo lại ở đây.
 *
 * File này chỉ chứa các màu CẦN dùng trực tiếp trong JS, ví dụ:
 *   - Recharts (stroke, fill, dot...)
 *   - Inline style
 *   - Arbitrary Tailwind values như border-[#xxx]
 *
 * Khi đổi bộ màu: chỉ sửa file này + theme.css.
 */

// ── Brand palette ──────────────────────────────────────────────────────────────
export const palette = {
  royalViolet:    '#40916c',
  purpleX11:      '#2ec4b6',
  softPeriwinkle: '#d6d6e6',
  wisteriaBlue:   '#ffc4d4',
  icyBlue:        '#e9ecef',
  frostedBlue:    '#faf9f6',
  icyAqua:        '#2ec4b6',
  icyAqua2:       '#d8f3dc',
  inkBlack:       '#12131a',
  primary:        '#40916c',
  accent:         '#2ec4b6',
  destructive:    '#d65f5f',
  success:        '#40916c',
  warning:        '#d99a42',
  indigo:         '#40916c',
  indigoDark:     '#52b788',
} as const

export const pastelChartColors = {
  powderBlush:    '#ffafcc',
  apricotCream:   '#ffc4d4',
  cream:          '#ffd166',
  teaGreen:       '#95d5b2',
  electricAqua:   '#40916c',
  babyBlueIce:    '#8ecae6',
  periwinkle:     '#b8b8dc',
  mauve:          '#cdb4db',
} as const

// ── Semantic aliases ───────────────────────────────────────────────────────────
/** Màu cho loại giao dịch */
export const transactionColors = {
  income:     pastelChartColors.teaGreen,
  expense:    pastelChartColors.powderBlush,
} as const

/** Màu chart (Recharts cần hex, không dùng CSS var được) */
export const chartColors = {
  income:  pastelChartColors.teaGreen,
  expense: pastelChartColors.powderBlush,
} as const

export const chartInteractionColors = {
  cursor: 'rgba(64, 145, 108, 0.16)',
  brushFill: 'rgba(46, 196, 182, 0.12)',
  pieStroke: 'rgba(18, 19, 26, 0.72)',
} as const

export const budgetMeterColors = {
  safe: palette.success,
  warning: palette.warning,
  danger: palette.destructive,
} as const

/**
 * Bảng màu cho pie/donut charts — đủ tương phản, không trùng nhau.
 * Đổi bộ màu thì sửa array này.
 */
export const categoryColors = [
  pastelChartColors.powderBlush,
  pastelChartColors.apricotCream,
  pastelChartColors.cream,
  pastelChartColors.teaGreen,
  pastelChartColors.electricAqua,
  pastelChartColors.babyBlueIce,
  pastelChartColors.periwinkle,
  pastelChartColors.mauve,
] as const

/** Màu border theo loại tài khoản (dùng trong Tailwind arbitrary value) */
export const accountBorderColors: Record<string, string> = {
  Bank:        pastelChartColors.babyBlueIce,
  'E-Wallet':  pastelChartColors.electricAqua,
  Cash:        pastelChartColors.apricotCream,
  bank:        pastelChartColors.babyBlueIce,
  wallet:      pastelChartColors.electricAqua,
  cash:        pastelChartColors.apricotCream,
  savings:     pastelChartColors.teaGreen,
  credit_card: pastelChartColors.powderBlush,
}

/** Màu fill/stroke theo loại tài khoản (dùng trong Recharts) */
export const accountChartColors: Record<string, string> = {
  Bank:        pastelChartColors.babyBlueIce,
  'E-Wallet':  pastelChartColors.electricAqua,
  Cash:        pastelChartColors.apricotCream,
  bank:        pastelChartColors.babyBlueIce,
  wallet:      pastelChartColors.electricAqua,
  cash:        pastelChartColors.apricotCream,
  savings:     pastelChartColors.teaGreen,
  credit_card: pastelChartColors.powderBlush,
}

/** Default color cho form tạo category mới */
export const defaultCategoryColor = palette.primary

/** Default color cho form tạo account mới */
export const defaultAccountColor = pastelChartColors.teaGreen
