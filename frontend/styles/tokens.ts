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
  primary:     '#c86bfa',   // mauve-magic — primary action, income, confirmed
  accent:      '#ffd500',   // gold — expense/chi tiêu, accent highlight
  destructive: '#ff4d4d',   // đỏ — danger, delete, error
  indigo:      '#3d0066',   // indigo deep — backgrounds
  indigoDark:  '#5c0099',   // indigo-2 — gradient stop, sidebar
  inkBlack:    '#03071e',   // background base
} as const

// ── Semantic aliases ───────────────────────────────────────────────────────────
/** Màu cho loại giao dịch */
export const transactionColors = {
  income:     palette.primary,
  expense:    palette.accent,
  investment: '#5c9efa',    // xanh dương — riêng cho investment
} as const

/** Màu chart (Recharts cần hex, không dùng CSS var được) */
export const chartColors = {
  income:  palette.primary,   // bar/line thu nhập
  expense: palette.accent,    // bar/line chi tiêu
} as const

/**
 * Bảng màu cho pie/donut charts — đủ tương phản, không trùng nhau.
 * Đổi bộ màu thì sửa array này.
 */
export const categoryColors = [
  palette.primary,   // mauve-magic
  palette.accent,    // gold
  '#ff6b9d',         // hồng
  '#5c9efa',         // xanh dương nhạt
  '#f59e0b',         // amber
  '#34d399',         // emerald
  '#fb923c',         // orange
  '#a78bfa',         // violet nhạt
  '#38bdf8',         // sky
  '#f472b6',         // pink
] as const

/** Màu border theo loại tài khoản (dùng trong Tailwind arbitrary value) */
export const accountBorderColors: Record<string, string> = {
  Bank:        '#5c9efa',
  'E-Wallet':  palette.primary,
  Investment:  palette.accent,
  Cash:        '#f59e0b',
}

/** Màu fill/stroke theo loại tài khoản (dùng trong Recharts) */
export const accountChartColors: Record<string, string> = {
  Bank:        '#5c9efa',
  'E-Wallet':  palette.primary,
  Investment:  palette.accent,
  Cash:        '#f59e0b',
}

/** Default color cho form tạo category mới */
export const defaultCategoryColor = palette.primary
