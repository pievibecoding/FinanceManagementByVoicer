import type { Transaction } from '@/api/dashboard'
import type { Budget } from '@/api/budgets'

interface Category {
  category_id: number
  category_name: string
}

interface BudgetOverviewProps {
  budgets: Budget[]
  categories: Category[]
  transactions: Transaction[]
}

export function BudgetOverview({ budgets, categories, transactions }: BudgetOverviewProps) {
  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n)

  const currentMonth = new Date().toISOString().slice(0, 7)

  // Calculate spending per category this month (expense only)
  const spendingMap: Record<number, number> = {}
  transactions.forEach(tx => {
    if (tx.type !== 'expense') return
    if (!tx.transaction_date.startsWith(currentMonth)) return
    const catId = Number(tx.category_id)
    spendingMap[catId] = (spendingMap[catId] ?? 0) + tx.amount
  })

  // Build items: only categories that have a budget AND have been spent this month
  const items = budgets
    .map(b => {
      const cat = categories.find(c => c.category_id === b.category_id)
      const spent = spendingMap[b.category_id] ?? 0
      return { ...b, category_name: cat?.category_name ?? `Danh mục ${b.category_id}`, spent }
    })
    .filter(item => item.spent > 0 || item.amount_limit > 0)
    .sort((a, b) => b.spent / b.amount_limit - a.spent / a.amount_limit)

  if (items.length === 0) {
    return (
      <div className="bg-card border border-border rounded-[var(--radius)] p-5 backdrop-blur-sm">
        <h3 className="text-foreground font-semibold text-sm mb-2">Ngân sách tháng này</h3>
        <p className="text-muted-foreground text-sm">Chưa có ngân sách nào được thiết lập.</p>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-[var(--radius)] p-5 backdrop-blur-sm">
      <h3 className="text-foreground font-semibold text-sm mb-4">Ngân sách tháng này</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {items.map(item => {
          const pct = item.amount_limit > 0 ? Math.min((item.spent / item.amount_limit) * 100, 100) : 0
          const over = item.spent > item.amount_limit
          const warn = pct >= 80
          const barColor = over ? 'bg-destructive' : warn ? 'bg-amber-400' : 'bg-primary'
          const pctColor = over ? 'text-destructive' : warn ? 'text-amber-400' : 'text-primary'

          return (
            <div key={item.budget_id} className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-foreground text-xs font-medium truncate max-w-[70%]">
                  {item.category_name}
                </span>
                <span className={`text-xs font-bold ${pctColor}`}>
                  {over ? 'Vượt!' : `${pct.toFixed(0)}%`}
                </span>
              </div>
              <div className="w-full bg-border/40 rounded-full h-1.5 mb-2">
                <div
                  className={`${barColor} h-1.5 rounded-full transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{fmt(item.spent)}đ</span>
                <span>{fmt(item.amount_limit)}đ</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
