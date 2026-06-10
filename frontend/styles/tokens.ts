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
  royalViolet:    '#7400b8',
  purpleX11:      '#934add',
  softPeriwinkle: '#9876e4',
  wisteriaBlue:   '#9ea1eb',
  icyBlue:        '#a3cdf1',
  frostedBlue:    '#a6eaf6',
  icyAqua:        '#a8f8f8',
  icyAqua2:       '#c7ffff',
  inkBlack:       '#050012',
  primary:        '#a8f8f8',
  accent:         '#934add',
  destructive:    '#ff0a12',
  success:        '#22d33d',
  warning:        '#fcf300',
  indigo:         '#7400b8',
  indigoDark:     '#934add',
} as const

export const pastelChartColors = {
  powderBlush:    '#ffadad',
  apricotCream:   '#ffd6a5',
  cream:          '#fdffb6',
  teaGreen:       '#caffbf',
  electricAqua:   '#9bf6ff',
  babyBlueIce:    '#a0c4ff',
  periwinkle:     '#bdb2ff',
  mauve:          '#ffc6ff',
} as const

// ── Semantic aliases ───────────────────────────────────────────────────────────
/** Màu cho loại giao dịch */
export const transactionColors = {
  income:     pastelChartColors.teaGreen,
  expense:    pastelChartColors.powderBlush,
  investment: pastelChartColors.babyBlueIce,
} as const

/** Màu chart (Recharts cần hex, không dùng CSS var được) */
export const chartColors = {
  income:  pastelChartColors.teaGreen,
  expense: pastelChartColors.powderBlush,
} as const

export const chartInteractionColors = {
  cursor: 'rgba(147, 74, 221, 0.22)',
  brushFill: 'rgba(147, 74, 221, 0.12)',
  pieStroke: 'rgba(3, 7, 30, 0.72)',
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
  Investment:  pastelChartColors.periwinkle,
  Cash:        pastelChartColors.apricotCream,
  bank:        pastelChartColors.babyBlueIce,
  wallet:      pastelChartColors.electricAqua,
  investment:  pastelChartColors.periwinkle,
  cash:        pastelChartColors.apricotCream,
  savings:     pastelChartColors.teaGreen,
  credit_card: pastelChartColors.powderBlush,
}

/** Màu fill/stroke theo loại tài khoản (dùng trong Recharts) */
export const accountChartColors: Record<string, string> = {
  Bank:        pastelChartColors.babyBlueIce,
  'E-Wallet':  pastelChartColors.electricAqua,
  Investment:  pastelChartColors.periwinkle,
  Cash:        pastelChartColors.apricotCream,
  bank:        pastelChartColors.babyBlueIce,
  wallet:      pastelChartColors.electricAqua,
  investment:  pastelChartColors.periwinkle,
  cash:        pastelChartColors.apricotCream,
  savings:     pastelChartColors.teaGreen,
  credit_card: pastelChartColors.powderBlush,
}

/** Default color cho form tạo category mới */
export const defaultCategoryColor = palette.primary
